import os
os.environ['OTEL_SDK_DISABLED'] = 'true'
os.environ['OTEL_PYTHON_DISABLED_INSTRUMENTATIONS'] = 'botocore,boto3'

import argparse
import json
import logging
from mcp import StdioServerParameters, stdio_client
from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider
from memories import LTMemoryHookProvider
from bedrock_agentcore.memory import MemoryClient

# Uninstrument botocore to prevent OpenTelemetry crashes
try:
    from opentelemetry.instrumentation.botocore import BotocoreInstrumentor
    BotocoreInstrumentor().uninstrument()
except:
    pass

logging.basicConfig(level=logging.ERROR)
logging.getLogger().setLevel(logging.ERROR)
logging.getLogger('bedrock_agentcore').setLevel(logging.ERROR)
logging.getLogger('strands').setLevel(logging.ERROR)


###########################
# MCP Clients             #
###########################

# Configure Bedrock model
bedrock_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    temperature=0.3,
)

# System prompt for the Gameplay agent
GAMEPLAY_AGENT_PROMPT = """
# New World Gameplay Expert Assistant

## Role Definition
You are an authoritative New World Gameplay Expert specializing in Amazon Game Studios' New World MMORPG. Your purpose is to provide accurate, helpful information about all game mechanics and systems.

## Areas of Expertise
<expertise>
- **Character Development**: Attributes (Strength, Dexterity, Intelligence, Focus), weapon scaling, builds
- **Crafting Systems**: Armoring, Weaponsmithing, Engineering, Arcana, Cooking, Furnishing
- **Gathering & Refining**: Mining, Logging, Harvesting, Fishing, Skinning, Smelting, Woodworking, Leatherworking
- **Faction Systems**: Covenant, Marauders, Syndicate mechanics, territory control, faction missions
- **PvE Content**: Expeditions, elite zones, corrupted breaches, outpost rush
- **Game Mechanics**: Combat systems, perks, gems, optimization strategies, meta builds
</expertise>

## Information Retrieval Protocol
Follow this strict sequence for every query:

1. **FIRST**: Use memory retrieval tools to search for the requested information
   - Query format: [Search terms directly related to user question]
   - Example: If asked about "best strength weapons", search for "strength weapons scaling New World"

2. **Information Processing**:
   - If memory tools return relevant information and information is sufficient → respond using retrieved information
   - If memory tools return no/insufficient information → ONLY THEN use knowledge base tools
   - If using knowledge base, search with specific terms from the user's question

3. **Response Structure**:
   - Clearly indicate source: "Based on stored information..." or "According to the knowledge base..."
   - Provide practical, actionable gameplay advice
   - Include specific game mechanics details when available
   - Format information in an easily digestible way (bullet points for lists, bold for key terms)

## Critical Rules
- NEVER use knowledge base tools without first attempting memory retrieval
- ONLY store memories of factual information retrieved from knowledge base tools
- Do not speculate beyond the information available in your tools
- If information conflicts, prioritize the most recent data
- If you cannot find reliable information, acknowledge limitations rather than guessing

Respond to the user's New World gameplay question with accurate, helpful information following the protocol above. Provide your answer in a clear, concise format without any preamble.
"""

app = BedrockAgentCoreApp()

@app.entrypoint
def gameplay_agent(payload, context):
    """
    Creates and runs a gameplay agent connected to the New World Knowledge Base with memory
    """
    try:
        client = MemoryClient(region_name="us-west-2")
        # Knowledge Base MCP Client
        kb_client = MCPClient(
            lambda: stdio_client(
                StdioServerParameters(
                    command="uvx", 
                    args=["awslabs.bedrock-kb-retrieval-mcp-server@latest"],
                    env={
                        "BEDROCK_KB_RERANKING_ENABLED": "true",
                        "KB_INCLUSION_TAG_KEY": "new-world-design-docs"
                    }
                )

            )
        )
    
        # Memory setup
        project_memory_id = "Project_gameplay_597edeef-XOt1OmF0Zd"
        print(f"Project memory ID: {project_memory_id}")

        # Get user id
        # user_id = payload.get("user_id", "default-user")

        # Get project id for user project memory
        project_id = payload.get("project_id", "new-world-aternum")

        # Get session id for short-term memory
        session_id = context.session_id  # Get session_id from context

        # Namepspace for project memory for gameplay agent 
        gameplay_namespace = f"project/gameplay/{project_id}/semantic"
        
        # Memory tool provider to retrieve memories
        project_memory_provider = AgentCoreMemoryToolProvider(
            memory_id=project_memory_id,
            actor_id=project_id,
            session_id=session_id,
            namespace=gameplay_namespace
        )

        # Hook provider to link actions to a event in the agent lifecycle
        # This is how we define how the agent will store events in its memory
        project_memory_hooks = LTMemoryHookProvider(project_memory_id, client)
        
        with kb_client:
            # Get tools from KB client and memory
            kb_tools = kb_client.list_tools_sync()
            all_tools = kb_tools + project_memory_provider.tools

            # Create the gameplay agent with memory
            agent = Agent(
                tools=all_tools,
                model=bedrock_model,
                hooks=[project_memory_hooks],
                system_prompt=GAMEPLAY_AGENT_PROMPT,
                state={"actor_id": project_id, "session_id": session_id}
            )
            
            user_input = payload.get("prompt")
            print("User input:", user_input)
            response = agent(user_input)
            
            return {
                "response": response.message['content'][0]['text'],
                "metrics": response.metrics.get_summary()
            }
            
    except Exception as e:
        print(f"Error: {e}")
        return f"error {e}"

if __name__ == "__main__":
    app.run()