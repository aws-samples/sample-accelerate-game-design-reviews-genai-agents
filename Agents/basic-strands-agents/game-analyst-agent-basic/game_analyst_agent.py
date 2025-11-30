from strands import Agent, tool
from strands.models import BedrockModel
import argparse
import json
import logging
import boto3
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from invoke_agent_utils import invoke_agent_with_boto3

logger = logging.getLogger(__name__).setLevel(logging.DEBUG)

app = BedrockAgentCoreApp()

# Configure Bedrock model
bedrock_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    temperature=0.3,
)

toolmetrics = []

# System prompt for the Game Analyst agent
GAME_ANALYST_PROMPT = """
PLEASE PRINT AT THE TOP IF YOU DONT USE THE TOOLS and EXPAND ON WHY YOU DIDNT. IF YOU DO USE THE TOOLS ANNOTATE WHERE.
You are a professional Game Analyst Agent specializing in analyzing submitted game design documents and providing expert feedback to game developers.
Your role is to carefully review game design documentation, understand the developer's vision, and answer their questions with insightful analysis and constructive recommendations.
When evaluating designs and content proposals provide feedback around lore, gameplay, and corporate strategy. All designs must be consistent with lore, gameplay, and corporate strategy.

You have access to the following tools that you can call upon when needed:
1. For queries around what the game is and questions about the game world and lore use lore_agent tool:
    - Specializes in narrative consistency, world-building, character development
    - Analyzes thematic elements, story structure, and narrative engagement
    - Evaluates lore systems, fictional histories, and setting coherence
    - Identifies opportunities for deeper player immersion through world design

2. For queries around game mechanics and gameplay use gameplay_agent tool:
    - Specializes in game systems, mechanics, balance, and player engagement
    - Analyzes core gameplay loops, progression systems, and player motivation
    - Evaluates difficulty curves, skill ceilings, and accessibility considerations
    - Identifies potential balance issues and optimization opportunities

3. For queries around corporate strategy, performance metrics, roadmaps, and strategic priorities use strategy_agent tool:
    - Specializes in corporate strategy, performance metrics, and strategic priorities
    - Analyzes corporate strategy, performance metrics, and strategic priorities
    - Evaluates corporate strategy, performance metrics, and strategic priorities
    - Identifies opportunities for improvement in corporate strategy, performance metrics, and strategic priorities
"""

def get_agent_arn(agent_name: str) -> str:
    """
    Retrieve agent ARN from Parameter Store
    """
    try:
        ssm = boto3.client('ssm')
        response = ssm.get_parameter(
            Name=f'/agents/{agent_name}_arn_no_memories'
        )
        return response['Parameter']['Value']
    except Exception as err:
        logger.exception("Exception getting ARNS")
        raise err

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
def game_analyst_agent(payload):
    global toolmetrics
    toolmetrics = []

    agent = Agent(
        tools=[get_lore_agent, get_strategy_agent, get_gameplay_agent],
        model=bedrock_model,
        system_prompt=GAME_ANALYST_PROMPT
    )

    try:
        user_input = payload.get("prompt")
        response = agent(user_input)
        fullmetrics = response.metrics.get_summary()
        output = {
            "response": response.message['content'][0]['text'],
            "metrics": fullmetrics,
            "toolMetrics": toolmetrics
        }
        return output
    except Exception as e:
        return f"error {e}"

if __name__ == "__main__":
    app.run()
