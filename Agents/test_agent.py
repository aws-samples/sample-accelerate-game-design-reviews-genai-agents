#!/usr/bin/env python3
"""Test agent invocation"""
import boto3
import json
from botocore.config import Config

def test_agent(agent_name, agent_arn, prompt):
    config = Config(read_timeout=300)
    client = boto3.client('bedrock-agentcore', config=config)
    
    print(f"\n{'='*60}")
    print(f"Testing {agent_name}")
    print(f"{'='*60}")
    print(f"ARN: {agent_arn}")
    print(f"Prompt: {prompt}\n")
    
    try:
        response = client.invoke_agent_runtime(
            agentRuntimeArn=agent_arn,
            qualifier="DEFAULT",
            payload=json.dumps({
                "prompt": prompt,
                "user_id": "test-user",
                "project_id": "new-world-aternum"
            })
        )
        
        print(f"✅ Status: {response['ResponseMetadata']['HTTPStatusCode']}")
        
        body = response['response'].read().decode('utf-8')
        print(f"Response: {body}..." if len(body) > 200 else f"Response: {body}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    ssm = boto3.client('ssm')
    
    # Test all agents
    agents = [
        ("Gameplay Agent", "/agents/gameplay_agent_arn", "What weapons scale with Strength?"),
        ("Lore Agent", "/agents/lore_agent_arn", "What is the Corruption?"),
        ("Strategy Agent", "/agents/strategy_agent_arn", "What are the Q1 2026 priorities?"),
        ("Game Analyst (Orchestrator)", "/agents/game_analyst_agent_arn", 
         "USE ALL TOOLS AND TELL ME IF YOU CANT. I want to add a Corrupted Blade that scales with Strength and aligns with Q1 2026 roadmap. What do you think?")
    ]
    
    for name, param_name, prompt in agents:
        try:
            arn = ssm.get_parameter(Name=param_name)['Parameter']['Value']
            test_agent(name, arn, prompt)
        except Exception as e:
            print(f"\n❌ Failed to get ARN for {name}: {e}")
