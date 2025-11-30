#!/usr/bin/env python3
"""
Verify that all memory agent fixes have been applied correctly
"""
import boto3
import json

def verify_iam_permissions():
    """Verify IAM roles have correct permissions"""
    iam = boto3.client('iam')
    
    memory_roles = [
        "agentcore-gameplay_agent_mem-role",
        "agentcore-lore_agent_mem-role",
        "agentcore-strategy_agent_mem-role",
        "agentcore-game_analyst_mem-role"
    ]
    
    required_actions = [
        "bedrock:InvokeModel",
        "bedrock:GetKnowledgeBase",
        "bedrock:Retrieve",
        "bedrock:Rerank",
        "s3:GetObject",
        "s3vectors:QueryVectors",
        "ecr:GetAuthorizationToken",
        "logs:CreateLogStream",
        "xray:PutTraceSegments",
        "bedrock-agentcore:GetWorkloadAccessToken",
        "bedrock-agentcore:CreateEvent",
        "bedrock-agentcore:ListMemories"
    ]
    
    print("="*60)
    print("Verifying IAM Permissions")
    print("="*60)
    
    all_good = True
    for role_name in memory_roles:
        print(f"\n✓ Checking {role_name}...")
        try:
            policy = iam.get_role_policy(
                RoleName=role_name,
                PolicyName="AgentCorePolicy"
            )
            
            policy_doc = policy['PolicyDocument']
            all_actions = []
            
            for statement in policy_doc['Statement']:
                actions = statement.get('Action', [])
                if isinstance(actions, str):
                    all_actions.append(actions)
                else:
                    all_actions.extend(actions)
            
            missing = []
            for action in required_actions:
                if not any(action in a for a in all_actions):
                    missing.append(action)
            
            if missing:
                print(f"  ❌ Missing permissions: {', '.join(missing)}")
                all_good = False
            else:
                print(f"  ✅ All required permissions present")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            all_good = False
    
    return all_good

def verify_agent_code():
    """Verify agent code has correct memory IDs"""
    import os
    
    print("\n" + "="*60)
    print("Verifying Agent Code Memory IDs")
    print("="*60)
    
    agents = [
        ("gameplay", "Project_gameplay_597edeef-XOt1OmF0Zd"),
        ("lore", "Project_lore_78f09820-iidpdZ4wfj"),
        ("strategy", "Project_strategy_3443cbe2-0vOWxMHl4Y")
    ]
    
    base_path = "/Users/sampatze/Documents/Projects/gitlab/accelerate-game-design-reviews-genai-agents/Agents/strands-agents-with-memory"
    
    all_good = True
    for agent_name, expected_id in agents:
        agent_file = f"{base_path}/{agent_name}-agent-with-memory/{agent_name}_agent.py"
        print(f"\n✓ Checking {agent_name} agent...")
        
        if not os.path.exists(agent_file):
            print(f"  ❌ File not found: {agent_file}")
            all_good = False
            continue
        
        with open(agent_file, 'r') as f:
            content = f.read()
        
        if expected_id in content:
            print(f"  ✅ Correct memory ID: {expected_id}")
        elif "{" in content and "memory_id}" in content:
            print(f"  ❌ Still has placeholder: Found template string")
            all_good = False
        else:
            print(f"  ⚠️  Memory ID not found (may need manual check)")
    
    return all_good

def main():
    print("\n" + "="*60)
    print("Memory Agent Fix Verification")
    print("="*60)
    
    iam_ok = verify_iam_permissions()
    code_ok = verify_agent_code()
    
    print("\n" + "="*60)
    print("Verification Summary")
    print("="*60)
    
    if iam_ok and code_ok:
        print("✅ All fixes verified successfully!")
        print("\nNext steps:")
        print("1. Redeploy the memory agents")
        print("2. Test agent invocations")
        print("3. Monitor CloudWatch logs")
    else:
        print("❌ Some issues found. Please review the output above.")
        if not iam_ok:
            print("  - IAM permissions need attention")
        if not code_ok:
            print("  - Agent code needs attention")

if __name__ == "__main__":
    main()
