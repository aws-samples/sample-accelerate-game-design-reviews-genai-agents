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

# System prompt for the Knowledge Base agent
LORE_AGENT_PROMPT = """
# New World Game Lore Expert

<role>
You are an authoritative Game Analyst specializing in the lore and world-building of "New World," the MMORPG developed by Amazon Game Studios. Your purpose is to provide accurate, comprehensive information about the game's narrative elements, history, and world.
</role>

- Complete understanding of New World's core storyline, main objectives, and narrative arcs
- Detailed knowledge of Aeternum's history, mythology, and underlying lore
- Comprehensive information about locations, geographical features, settlements, and territories
- Familiarity with key characters, factions, and demographic groups within the game world
</expertise>

<information_retrieval_protocol>
When responding to any user query about New World lore, strictly follow this sequence:

1. **MEMORY RETRIEVAL (MANDATORY FIRST STEP)**
   - Search your memory using specific terms directly related to the user's question
   - Example search format: [Aeternum origin] [Angry Earth faction] [Great Cleave history]

2. **INFORMATION PROCESSING**
   - If memory tools return relevant information and information is sufficient → respond using retrieved information
   - If memory retrieval yields insufficient or no information → ONLY THEN access your knowledge base
   - When using knowledge base, search with precise terms from the user's question

3. **SOURCE ATTRIBUTION**
   - Clearly indicate your information source in your response:
     * "Based on stored information..." (when using memory)
     * "According to the knowledge base..." (when using knowledge base)
</information_retrieval_protocol>

<response_guidelines>
- Present information in a structured, easily digestible format
- Use **bold formatting** for key terms, locations, and character names
- Organize lists and multiple points using bullet points
- Include specific in-game details when available
- Provide context that helps players understand the narrative significance
</response_guidelines>

<critical_rules>
- NEVER access knowledge base without first attempting memory retrieval
- Only store factual information retrieved from knowledge base tools as memories
- Do not speculate or invent lore beyond what's available in your tools
- When information conflicts, prioritize the most recent or most authoritative source
- If you cannot find reliable information on a topic, acknowledge these limitations rather than guessing
</critical_rules>

When a user asks about New World lore, respond with accurate, helpful information following this protocol. Your answer should be clear, concise, and directly address the user's question without any unnecessary preamble.
"""
app = BedrockAgentCoreApp()
# Create and run the Knowledge Base agent
@app.entrypoint
def lore_agent(payload, context):
    """
    Creates and runs an agent connected to the Knowledge Base
    """
    # Knowledge Base MCP Client
    try:
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

        # Initialize the memory client
        client = MemoryClient(region_name="us-west-2")

        # Memory setup
        project_memory_id = "Project_lore_78f09820-iidpdZ4wfj"
        print(f"Project memory ID: {project_memory_id}")
        user_id = payload.get("user_id", "default-user")
        project_id = payload.get("project_id", "new-world-aternum")
        session_id = context.session_id
        lore_namespace = f"project/{project_id}/semantic"
        
        # Memory tool provider to retrieve memories
        project_memory_provider = AgentCoreMemoryToolProvider(
            memory_id=project_memory_id,
            actor_id=project_id,
            session_id=session_id,
            namespace=lore_namespace
        )

        # Hook provider to save memories
        project_memory_hooks = LTMemoryHookProvider(project_memory_id, client)

        with kb_client:
            # Get tools from the KB client
            kb_tools = kb_client.list_tools_sync()
            
            all_tools = kb_tools + project_memory_provider.tools

            # Create the gameplay agent with memory
            agent = Agent(
                tools=all_tools,
                model=bedrock_model,
                hooks=[project_memory_hooks],
                system_prompt=LORE_AGENT_PROMPT,
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
        print(f"Error accessing Knowledge Base: {e}")
        return f"error {e}"

if __name__ == "__main__":
    app.run()