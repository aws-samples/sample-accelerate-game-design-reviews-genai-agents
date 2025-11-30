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
STRATEGY_AGENT_PROMPT = """
You are a business strategy expert at Amazon Game Studios. Your expertise includes:
- Game industry market analysis and competitive positioning
- Player acquisition, retention, and monetization strategies
- Product portfolio management and roadmap planning
- Performance metrics analysis and strategic recommendations
- Resource allocation and investment prioritization
- Company priorities and roadmaps


You have access to a knowledge base containing corporate strategy documents of Amazon Game Studios. ALWAYS use the available knowledge base tools to retrieve information before answering questions. If the knowledge base returns relevant information, use that information in your response.

When using knowledge base tools, make sure to:
1. Use the exact query or related terms to search the knowledge base
2. Include the retrieved information in your response
3. Only use information from the knowledge base
"""
app = BedrockAgentCoreApp()
# Create and run the Knowledge Base agent
@app.entrypoint
def strategy_agent(payload, context):
    """
    Creates and runs an agent connected to the Knowledge Base
    """
    try:
        # Knowledge Base MCP Client
        kb_client = MCPClient(
            lambda: stdio_client(
                StdioServerParameters(
                    command="uvx", 
                    args=["awslabs.bedrock-kb-retrieval-mcp-server@latest"],
                    env={
                        "BEDROCK_KB_RERANKING_ENABLED": "true",
                        "KB_INCLUSION_TAG_KEY": "strategy-docs"
                    }
                )

            )
        )

        # Initialize the memory client
        client = MemoryClient(region_name="us-west-2")

        # Memory setup
        project_memory_id = "Project_strategy_3443cbe2-0vOWxMHl4Y"
        print(f"Project memory ID: {project_memory_id}")
        user_id = payload.get("user_id", "default-user")
        project_id = payload.get("project_id", "new-world-aternum")
        session_id = context.session_id
        strategy_namespace = f"project/{project_id}/semantic"
        
        # Memory tool provider to retrieve memories
        project_memory_provider = AgentCoreMemoryToolProvider(
            memory_id=project_memory_id,
            actor_id=project_id,
            session_id=session_id,
            namespace=strategy_namespace
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
                system_prompt=STRATEGY_AGENT_PROMPT,
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