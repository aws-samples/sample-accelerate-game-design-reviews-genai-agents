#!/usr/bin/env python3
"""
Deploy all agents WITH memories for New World Game Analysis System
Creates new IAM roles with memory permissions
"""
import os
import sys
import boto3
import json
import string
import random
from dotenv import load_dotenv
from bedrock_agentcore_starter_toolkit import Runtime
from boto3.session import Session
import time

load_dotenv()

def generate_random_suffix(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def create_agentcore_role(agent_name, region, memory_ids=None):
    """Create or update IAM role with AgentCore permissions and optional memory access"""
    iam = boto3.client('iam')
    account_id = boto3.client('sts').get_caller_identity()['Account']
    role_name = f"agentcore-{agent_name}-role"
    
    # Trust policy
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "AssumeRolePolicy",
            "Effect": "Allow",
            "Principal": {"Service": "bedrock-agentcore.amazonaws.com"},
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {"aws:SourceAccount": account_id},
                "ArnLike": {"aws:SourceArn": f"arn:aws:bedrock-agentcore:{region}:{account_id}:*"}
            }
        }]
    }
    
    # Create role
    try:
        response = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description=f"AgentCore execution role for {agent_name}"
        )
        print(f"✅ Created role: {role_name}")
    except iam.exceptions.EntityAlreadyExistsException:
        response = iam.get_role(RoleName=role_name)
        print(f"ℹ️  Updating existing role: {role_name}")
    
    # Complete base permissions (matching working non-memory agents)
    base_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "BedrockPermissions",
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream"
                ],
                "Resource": "*"
            },
            {
                "Sid": "BedrockAgentKnowledgeBasePermissions",
                "Effect": "Allow",
                "Action": [
                    "bedrock:GetKnowledgeBase",
                    "bedrock:Retrieve",
                    "bedrock:Rerank",
                    "bedrock:ListTagsForResource",
                    "bedrock:ListDataSources"
                ],
                "Resource": [
                    f"arn:aws:bedrock:{region}:{account_id}:knowledge-base/*"
                ]
            },
            {
                "Sid": "BedrockAgentListKnowledgeBasePermissions",
                "Effect": "Allow",
                "Action": [
                    "bedrock:ListKnowledgeBases"
                ],
                "Resource": [
                    f"arn:aws:bedrock:{region}:{account_id}:*"
                ]
            },
            {
                "Sid": "S3Permissions",
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::*"
                ]
            },
            {
                "Sid": "S3VectorPermissions",
                "Effect": "Allow",
                "Action": [
                    "s3vectors:GetIndex",
                    "s3vectors:ListIndexes",
                    "s3vectors:ListVectorBuckets",
                    "s3vectors:ListVectors",
                    "s3vectors:GetVectors",
                    "s3vectors:QueryVectors"
                ],
                "Resource": [
                    f"arn:aws:s3vectors:{region}:{account_id}:bucket/*new-world*/index/*",
                    f"arn:aws:s3vectors:{region}:{account_id}:bucket/*new-world*"
                ]
            },
            {
                "Sid": "ECRImageAccess",
                "Effect": "Allow",
                "Action": [
                    "ecr:BatchGetImage",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:GetAuthorizationToken"
                ],
                "Resource": [
                    f"arn:aws:ecr:{region}:{account_id}:repository/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "logs:DescribeLogStreams",
                    "logs:CreateLogGroup"
                ],
                "Resource": [
                    f"arn:aws:logs:{region}:{account_id}:log-group:/aws/bedrock-agentcore/runtimes/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "logs:DescribeLogGroups"
                ],
                "Resource": [
                    f"arn:aws:logs:{region}:{account_id}:log-group:*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                "Resource": [
                    f"arn:aws:logs:{region}:{account_id}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*"
                ]
            },
            {
                "Sid": "ECRTokenAccess",
                "Effect": "Allow",
                "Action": [
                    "ecr:GetAuthorizationToken"
                ],
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "xray:PutTraceSegments",
                    "xray:PutTelemetryRecords",
                    "xray:GetSamplingRules",
                    "xray:GetSamplingTargets"
                ],
                "Resource": [
                    "*"
                ]
            },
            {
                "Effect": "Allow",
                "Resource": "*",
                "Action": "cloudwatch:PutMetricData",
                "Condition": {
                    "StringEquals": {
                        "cloudwatch:namespace": "bedrock-agentcore"
                    }
                }
            },
            {
                "Sid": "GetAgentAccessToken",
                "Effect": "Allow",
                "Action": [
                    "bedrock-agentcore:GetWorkloadAccessToken",
                    "bedrock-agentcore:GetWorkloadAccessTokenForJWT",
                    "bedrock-agentcore:GetWorkloadAccessTokenForUserId"
                ],
                "Resource": [
                    f"arn:aws:bedrock-agentcore:{region}:{account_id}:workload-identity-directory/default",
                    f"arn:aws:bedrock-agentcore:{region}:{account_id}:workload-identity-directory/default/workload-identity/{agent_name}-*"
                ]
            },
            {
                "Sid": "GetParameterSSMAccess",
                "Effect": "Allow",
                "Action": [
                    "ssm:GetParameter"
                ],
                "Resource": "*"
            }
        ]
    }
    
    # Add memory permissions if provided
    if memory_ids:
        memory_statement = {
            "Effect": "Allow",
            "Action": [
                "bedrock-agentcore:GetMemory",
                "bedrock-agentcore:RetrieveMemoryRecords",
                "bedrock-agentcore:GetMemoryRecord",
                "bedrock-agentcore:CreateEvent",
                "bedrock-agentcore:GetEvent",
                "bedrock-agentcore:CreateMemory",
                "bedrock-agentcore:DeleteMemoryRecord",
                "bedrock-agentcore:DeleteMemory",
                "bedrock-agentcore:UpdateMemory"
            ],
            "Resource": [f"arn:aws:bedrock-agentcore:{region}:{account_id}:memory/{mid}" for mid in memory_ids]
        }
        base_policy["Statement"].append(memory_statement)
        
        list_statement = {
            "Effect": "Allow",
            "Action": [
                "bedrock-agentcore:ListEvents",
                "bedrock-agentcore:ListMemories",
                "bedrock-agentcore:ListMemoryRecords",
                "bedrock-agentcore:ListSessions"
            ],
            "Resource": "*"
        }
        base_policy["Statement"].append(list_statement)
    
    # Update policy (overwrites existing)
    iam.put_role_policy(
        RoleName=role_name,
        PolicyName="AgentCorePolicy",
        PolicyDocument=json.dumps(base_policy)
    )
    print(f"✅ Updated permissions for {role_name}")
    
    return response

def add_orchestrator_permissions(role_name, sub_agent_arns, sub_agent_param_arns, region):
    """Add permissions for orchestrator to invoke sub-agents"""
    iam = boto3.client('iam')
    account_id = boto3.client('sts').get_caller_identity()['Account']
    
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["bedrock-agentcore:InvokeAgentRuntime"],
                "Resource": [f"{arn}/runtime-endpoint/DEFAULT" for arn in sub_agent_arns] + sub_agent_arns
            },
            {
                "Effect": "Allow",
                "Action": ["ssm:GetParameter"],
                "Resource": sub_agent_param_arns
            }
        ]
    }
    
    iam.put_role_policy(
        RoleName=role_name,
        PolicyName="SubAgentInvokePermissions",
        PolicyDocument=json.dumps(policy)
    )
    print(f"✅ Added orchestrator permissions to {role_name}")

def configure_runtime(agent_name, role_arn, python_file_name):
    boto_session = Session(region_name=os.getenv("AWS_REGION"))
    region = boto_session.region_name
    agentcore_runtime = Runtime()
    
    response = agentcore_runtime.configure(
        entrypoint=python_file_name,
        execution_role=role_arn,
        auto_create_ecr=True,
        requirements_file="requirements.txt",
        region=region,
        agent_name=agent_name
    )
    return response, agentcore_runtime

def check_status(agent_runtime):
    status_response = agent_runtime.status()
    status = status_response.endpoint['status']
    end_status = ['READY', 'CREATE_FAILED', 'DELETE_FAILED', 'UPDATE_FAILED']
    while status not in end_status:
        time.sleep(10)
        status_response = agent_runtime.status()
        status = status_response.endpoint['status']
        print(f"  Status: {status}")
    return status

def deploy_agent(agent_dir, agent_file, agent_name, role_arn, param_name):
    """Deploy a single agent"""
    print(f"\n{'='*60}")
    print(f"Deploying {agent_name}")
    print(f"{'='*60}")
    
    original_dir = os.getcwd()
    os.chdir(agent_dir)
    
    _, runtime = configure_runtime(agent_name, role_arn, agent_file)
    launch_result = runtime.launch(auto_update_on_conflict="true")
    agent_arn = launch_result.agent_arn
    
    print(f"✅ Agent ARN: {agent_arn}")
    
    status = check_status(runtime)
    print(f"✅ Status: {status}")
    
    ssm = boto3.client('ssm')
    ssm.put_parameter(
        Name=param_name,
        Value=agent_arn,
        Type='String',
        Overwrite=True
    )
    print(f"✅ Saved to Parameter Store: {param_name}")
    
    os.chdir(original_dir)
    return agent_arn

def main():
    region = os.getenv("AWS_REGION", "us-west-2")
    base_dir = "/Users/sampatze/Documents/Projects/gitlab/accelerate-game-design-reviews-genai-agents/Agents/strands-agents-with-memory"
    
    # Memory IDs from notebook
    gameplay_memory_id = "Project_gameplay_597edeef-XOt1OmF0Zd"
    lore_memory_id = "Project_lore_78f09820-iidpdZ4wfj"
    strategy_memory_id = "Project_strategy_3443cbe2-0vOWxMHl4Y"
    user_prefs_memory_id = "GameAnalystUserPrefs_37d1e66e-Ytm1ni3Db5"
    session_memory_id = "GameAnalystShortTermMemory_6502d2be-wJVopQEE4H"
    
    print("\n" + "="*60)
    print("Creating/Updating IAM Roles")
    print("="*60)
    
    # Use fixed role names (not random)
    gameplay_role = create_agentcore_role(
        "gameplay_agent_mem",
        region,
        [gameplay_memory_id]
    )
    gameplay_role_arn = gameplay_role['Role']['Arn']
    gameplay_role_name = gameplay_role['Role']['RoleName']
    
    lore_role = create_agentcore_role(
        "lore_agent_mem",
        region,
        [lore_memory_id]
    )
    lore_role_arn = lore_role['Role']['Arn']
    lore_role_name = lore_role['Role']['RoleName']
    
    strategy_role = create_agentcore_role(
        "strategy_agent_mem",
        region,
        [strategy_memory_id]
    )
    strategy_role_arn = strategy_role['Role']['Arn']
    strategy_role_name = strategy_role['Role']['RoleName']
    
    # Create role for orchestrator with all memories
    analyst_role = create_agentcore_role(
        "game_analyst_mem",
        region,
        [user_prefs_memory_id, session_memory_id]
    )
    analyst_role_arn = analyst_role['Role']['Arn']
    analyst_role_name = analyst_role['Role']['RoleName']
    
    # Ask what to deploy
    print("\n" + "="*60)
    print("Deployment Options")
    print("="*60)
    print("1. Deploy all agents (sub-agents + orchestrator)")
    print("2. Deploy orchestrator only")
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        print("\n" + "="*60)
        print("Deploying Sub-Agents")
        print("="*60)
        
        # Deploy sub-agents
        gameplay_arn = deploy_agent(
            f"{base_dir}/gameplay-agent-with-memory",
            "gameplay_agent.py",
            "gameplay_agent",
            gameplay_role_arn,
            "/agents/gameplay_agent_arn"
        )
        
        lore_arn = deploy_agent(
            f"{base_dir}/lore-agent-with-memory",
            "lore_agent.py",
            "lore_agent",
            lore_role_arn,
            "/agents/lore_agent_arn"
        )
        
        strategy_arn = deploy_agent(
            f"{base_dir}/strategy-agent-with-memory",
            "strategy_agent.py",
            "strategy_agent",
            strategy_role_arn,
            "/agents/strategy_agent_arn"
        )
        
        # Get parameter ARNs
        ssm = boto3.client('ssm')
        gameplay_param_arn = ssm.get_parameter(Name="/agents/gameplay_agent_arn")['Parameter']['ARN']
        lore_param_arn = ssm.get_parameter(Name="/agents/lore_agent_arn")['Parameter']['ARN']
        strategy_param_arn = ssm.get_parameter(Name="/agents/strategy_agent_arn")['Parameter']['ARN']
        
        # Add orchestrator permissions
        add_orchestrator_permissions(
            analyst_role_name,
            [gameplay_arn, lore_arn, strategy_arn],
            [gameplay_param_arn, lore_param_arn, strategy_param_arn],
            region
        )
    else:
        # Get existing sub-agent ARNs from parameter store
        ssm = boto3.client('ssm')
        gameplay_arn = ssm.get_parameter(Name="/agents/gameplay_agent_arn")['Parameter']['Value']
        lore_arn = ssm.get_parameter(Name="/agents/lore_agent_arn")['Parameter']['Value']
        strategy_arn = ssm.get_parameter(Name="/agents/strategy_agent_arn")['Parameter']['Value']
        gameplay_param_arn = ssm.get_parameter(Name="/agents/gameplay_agent_arn")['Parameter']['ARN']
        lore_param_arn = ssm.get_parameter(Name="/agents/lore_agent_arn")['Parameter']['ARN']
        strategy_param_arn = ssm.get_parameter(Name="/agents/strategy_agent_arn")['Parameter']['ARN']
        
        # Add orchestrator permissions
        add_orchestrator_permissions(
            analyst_role_name,
            [gameplay_arn, lore_arn, strategy_arn],
            [gameplay_param_arn, lore_param_arn, strategy_param_arn],
            region
        )
    
    print("\n" + "="*60)
    print("Deploying Orchestrator")
    print("="*60)
    
    # Deploy orchestrator
    analyst_arn = deploy_agent(
        f"{base_dir}/game-analyst-agent-with-memory",
        "game_analyst_agent.py",
        "game_analyst_agent",
        analyst_role_arn,
        "/agents/game_analyst_agent_arn"
    )
    
    print("\n" + "="*60)
    print("Deployment Complete!")
    print("="*60)
    print(f"Gameplay Agent: {gameplay_arn}")
    print(f"Lore Agent: {lore_arn}")
    print(f"Strategy Agent: {strategy_arn}")
    print(f"Game Analyst Agent: {analyst_arn}")

if __name__ == "__main__":
    main()
