
from mcp import StdioServerParameters, stdio_client
import json
from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Configure Bedrock model
bedrock_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    temperature=0.3,
)

# System prompt for the Knowledge Base agent
LORE_AGENT_PROMPT = """
You are a Game Analyst expert specializing in game lore for the game New World built by Amazon Game Studios. Your expertise includes:
- Overview of what the game New World is and they main goals and story
- Lore and history of the world the game takes place in
- The game world and aspects such as locations, geography, demographics, and characters

You have access to a knowledge base containing information from the New World Fandom Wiki. ALWAYS use the available knowledge base tools to retrieve information before answering questions. If the knowledge base returns relevant information, use that information in your response.

When using knowledge base tools, make sure to:
1. Use the exact query or related terms to search the knowledge base
2. Include the retrieved information in your response
3. Only use information from the knowledge base
"""
app = BedrockAgentCoreApp()
# Create and run the Knowledge Base agent
@app.entrypoint
def lore_agent(payload):
    """
    Creates and runs an agent connected to the Knowledge Base
    """

    try:
        # Create a fresh MCP client for each invocation
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
        
        with kb_client:
            # Get tools from the KB client
            kb_tools = kb_client.list_tools_sync()

            # Create the gameplay agent
            agent = Agent(
                tools=kb_tools,
                model=bedrock_model,
                system_prompt=LORE_AGENT_PROMPT
            )

            user_input = payload.get("prompt")
            response = agent(user_input)
            output = {
                "response": response.message['content'][0]['text'],
                "metrics": response.metrics.get_summary()
            }
            return output


    except Exception as e:
        print(f"Error accessing Knowledge Base: {e}")
        return f"error {e}"

if __name__ == "__main__":
    app.run()
