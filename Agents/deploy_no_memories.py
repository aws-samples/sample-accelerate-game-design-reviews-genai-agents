#!/usr/bin/env python3
"""
Deploy all basic agents (no memories) for New World Game Analysis System
"""
import os
import sys
import boto3
from dotenv import load_dotenv
from bedrock_agentcore_starter_toolkit import Runtime
from boto3.session import Session
import time

load_dotenv()

def configure_runtime(agent_name, agentcore_iam_role, python_file_name):
    boto_session = Session(region_name=os.getenv("AWS_REGION"))
    region = boto_session.region_name
    agentcore_runtime = Runtime()
    
    response = agentcore_runtime.configure(
        entrypoint=python_file_name,
        execution_role=agentcore_iam_role['Role']['Arn'],
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
        print(f"Status: {status}")
    return status

def get_existing_role_arn(role_name):
    """Get existing IAM role ARN"""
    iam = boto3.client('iam')
    try:
        response = iam.get_role(RoleName=role_name)
        return response
    except iam.exceptions.NoSuchEntityException:
        print(f"❌ Role {role_name} not found. Please create it first.")
        sys.exit(1)

def deploy_agent(agent_dir, agent_file, agent_name, role_name, param_name):
    """Deploy a single agent"""
    print(f"\n{'='*60}")
    print(f"Deploying {agent_name}")
    print(f"{'='*60}")
    
    # Change to agent directory
    original_dir = os.getcwd()
    os.chdir(agent_dir)
    
    # Get IAM role
    iam_role = get_existing_role_arn(role_name)
    
    # Configure and launch
    _, runtime = configure_runtime(agent_name, iam_role, agent_file)
    launch_result = runtime.launch(auto_update_on_conflict="true")
    agent_arn = launch_result.agent_arn
    
    print(f"✅ Agent ARN: {agent_arn}")
    
    # Check status
    status = check_status(runtime)
    print(f"✅ Status: {status}")
    
    # Save to Parameter Store
    ssm = boto3.client('ssm')
    ssm.put_parameter(
        Name=param_name,
        Value=agent_arn,
        Type='String',
        Overwrite=True
    )
    print(f"✅ Saved to Parameter Store: {param_name}")
    
    # Return to original directory
    os.chdir(original_dir)
    
    return agent_arn

def main():
    base_dir = "/Users/sampatze/Documents/Projects/gitlab/accelerate-game-design-reviews-genai-agents/Agents/basic-strands-agents"
    
    agents = [
        {
            "dir": f"{base_dir}/gameplay-agent-basic",
            "file": "gameplay_agent.py",
            "name": "gameplay_agent_no_memory",
            "role": "agentcore-gameplay_agent_gbpz6w-role",
            "param": "/agents/gameplay_agent_arn_no_memories"
        },
        {
            "dir": f"{base_dir}/lore-agent-basic",
            "file": "lore_agent.py",
            "name": "lore_agent_no_memories",
            "role": "agentcore-lore_agent_piscxw-role",
            "param": "/agents/lore_agent_arn_no_memories"
        },
        {
            "dir": f"{base_dir}/strategy-agent-basic",
            "file": "strategy_agent.py",
            "name": "strategy_agent_no_memories",
            "role": "agentcore-strategy_agent_8zvhvo-role",
            "param": "/agents/strategy_agent_arn_no_memories"
        },
        {
            "dir": f"{base_dir}/game-analyst-agent-basic",
            "file": "game_analyst_agent.py",
            "name": "game_analyst_agent_no_memories",
            "role": "agentcore-game_analyst_agent_fm2dr4-role",
            "param": "/agents/game_analyst_agent_arn_no_memories"
        }
    ]
    
    deployed_arns = {}
    
    for agent in agents:
        try:
            arn = deploy_agent(
                agent["dir"],
                agent["file"],
                agent["name"],
                agent["role"],
                agent["param"]
            )
            deployed_arns[agent["name"]] = arn
        except Exception as e:
            print(f"❌ Failed to deploy {agent['name']}: {e}")
            continue
    
    print(f"\n{'='*60}")
    print("Deployment Summary")
    print(f"{'='*60}")
    for name, arn in deployed_arns.items():
        print(f"{name}: {arn}")

if __name__ == "__main__":
    main()
