import os
os.environ['OTEL_SDK_DISABLED'] = 'true'
os.environ['OTEL_PYTHON_DISABLED_INSTRUMENTATIONS'] = 'botocore,boto3'

import json
import logging
import boto3
from typing import Dict, Any
from strands import Agent, tool
from strands.models import BedrockModel
from bedrock_agentcore.memory import MemoryClient
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands.hooks import AgentInitializedEvent, HookProvider, HookRegistry, MessageAddedEvent
from invoke_agent_utils import invoke_agent_with_boto3
from memories import ShortTermMemoryHook as STM, LTMemoryHookProvider as LTM
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider

try:
    from opentelemetry.instrumentation.botocore import BotocoreInstrumentor
    BotocoreInstrumentor().uninstrument()
except:
    pass

logging.basicConfig(level=logging.ERROR)
logging.getLogger().setLevel(logging.ERROR)
logging.getLogger('bedrock_agentcore').setLevel(logging.ERROR)
logging.getLogger('strands').setLevel(logging.ERROR)

# Initialize the agent core app
app = BedrockAgentCoreApp()

toolmetrics = []

# Configure Bedrock model
bedrock_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    temperature=0.3,
)


# System prompt for the Game Analyst agent
GAME_ANALYST_PROMPT = """
PLEASE PRINT AT THE TOP IF YOU DONT USE THE TOOLS and EXPAND ON WHY YOU DIDNT. IF YOU DO USE THE TOOLS ANNOTATE WHERE.

# Game Analyst Agent

## Role and Expertise
You are a professional Game Analyst Agent specializing in analyzing game design documents for New World Aeternum (also known as New World). Your expertise includes understanding the game's story, lore, gameplay mechanics, and overall design philosophy.

## Primary Objectives
- Review game design documentation thoroughly
- Understand the developer's vision and intentions
- Provide expert feedback with insightful analysis
- Offer constructive recommendations that maintain consistency with the game's established elements
- Remember user preferences from previous interactions in the same session

## Available Tools
You have access to specialized tools to enhance your analysis:

<tool_lore>
**Lore Agent Tool**
Use this tool for queries about the game world, story, and lore:
- Narrative consistency and world-building evaluation
- Character development analysis
- Thematic elements and story structure assessment
- Fictional histories and setting coherence verification
- Identification of opportunities for deeper player immersion
</tool_lore>

<tool_gameplay>
**Gameplay Agent Tool**
Use this tool for queries about game mechanics and gameplay systems:
- Game systems, mechanics, and balance analysis
- Core gameplay loops and progression systems evaluation
- Player motivation and engagement assessment
- Difficulty curves, skill ceilings, and accessibility considerations
- Identification of potential balance issues and optimization opportunities
</tool_gameplay>

<tool_strategy>
**Corporate Strategy Agent Tool**
For queries around corporate strategy, performance metrics, roadmaps, and strategic priorities use strategy_agent tool:
    - Specializes in corporate strategy, performance metrics, and strategic priorities
    - Analyzes corporate strategy, performance metrics, and strategic priorities
    - Evaluates corporate strategy, performance metrics, and strategic priorities
    - Identifies opportunities for improvement in corporate strategy, performance metrics, and strategic priorities
</tool_strategy>

## Memory Functionality
You can recall previous interactions across sessions within the previous 7 days. Always refer to your memory regarding user preferences for formatting your responses and their specific interests or concerns about their game design. You may refer to previously saved memories on session data to answer questions.

## Response Guidelines
1. Analyze the submitted game design document thoroughly
2. Maintain consistency with New World's established story, lore, and gameplay
3. Provide specific, actionable feedback rather than general statements
4. Format your response according to previously established user preferences

When responding to queries, provide your analysis directly without preambles or additional explanations beyond what was requested.
"""

def get_agent_arn(agent_name: str) -> str:
    """
    Retrieve agent ARN from Parameter Store
    """
    ssm = boto3.client('ssm')
    response = ssm.get_parameter(Name=f'/agents/{agent_name}_arn')
    return response['Parameter']['Value']


@tool
def get_lore_agent(payload) -> str:
    """
    Call the lore agent tool to get information about the game lore.
    """
    lore_agent_arn = get_agent_arn("lore_agent")
    response = json.loads(invoke_agent_with_boto3(lore_agent_arn, user_query=payload))
    toolmetrics.append(response['metrics'])
    return response['response']

@tool
def get_gameplay_agent(payload) -> str:
    """
    Call the gameplay agent tool to get information about gameplay.
    """
    gameplay_agent_arn = get_agent_arn("gameplay_agent")
    response = json.loads(invoke_agent_with_boto3(gameplay_agent_arn, user_query=payload))
    toolmetrics.append(response['metrics'])
    return response['response']

@tool
def get_strategy_agent(payload) -> str:
    """
    Call the strategy agent tool to get information about corporate strategy.
    """
    strategy_agent_arn = get_agent_arn("strategy_agent")
    response = json.loads(invoke_agent_with_boto3(strategy_agent_arn, user_query=payload))
    toolmetrics.append(response['metrics'])
    return response['response']

@app.entrypoint
def game_analyst_agent(payload, context):
    global toolmetrics
    toolmetrics = []
    user_input = payload.get("prompt")
    user_id = payload.get("user_id", "default-user")
    project_id = payload.get("project_id", "new-world-aternum")
    session_id = context.session_id
    
    client = MemoryClient(region_name="us-west-2")
    
    # Memory setup
    user_prefs_memory_id = "GameAnalystUserPrefs_37d1e66e-Ytm1ni3Db5"
    user_prefs_namespace = f"analyst/{user_id}/preferences"

    # Memory tool provider
    user_prefs_memory_provider = AgentCoreMemoryToolProvider(
        memory_id=user_prefs_memory_id,
        actor_id=user_id,
        session_id=session_id,
        namespace=user_prefs_namespace
    )
    session_memory_id = "GameAnalystShortTermMemory_6502d2be-wJVopQEE4H"

    user_prefs_memory_hooks = LTM(user_prefs_memory_id, client)
    session_memory_hooks = STM(client, session_memory_id)

    agent = Agent(
        tools=[get_gameplay_agent, get_lore_agent, get_strategy_agent] + user_prefs_memory_provider.tools,
        model=bedrock_model,
        hooks=[user_prefs_memory_hooks, session_memory_hooks],
        system_prompt=GAME_ANALYST_PROMPT,
        state={"actor_id": user_id, "session_id": session_id}
    )
    
    try:
        response = agent(user_input)
        
        return {
            "response": response.message['content'][0]['text'],
            "metrics": response.metrics.get_summary(),
            "toolMetrics": toolmetrics
        }
    except Exception as e:
        return {"error": str(e)}
    

if __name__ == "__main__":
    app.run()