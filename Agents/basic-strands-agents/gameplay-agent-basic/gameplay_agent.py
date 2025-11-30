
import argparse
import json
from mcp import StdioServerParameters, stdio_client
from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Model: Configure Bedrock model
bedrock_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    temperature=0.3,
)


# Prompt: System prompt for the Gameplay agent
GAMEPLAY_AGENT_PROMPT = """
You are a New World Gameplay Expert specializing in all gameplay mechanics for New World built by Amazon Game Studios. Your expertise includes:
- Character attributes and weapon scaling (Strength, Dexterity, Intelligence, Focus)
- Crafting systems (Armoring, Weaponsmithing, Arcana, Cooking, etc.)
- Gathering and refining (Mining, Logging, Harvesting, Fishing, Skinning)
- Territory control and faction systems (Covenant, Marauders, Syndicate)
- Expeditions and PvE content
- Game mechanics and optimization strategies

ALWAYS use the available knowledge base tools to retrieve information before answering questions. If the knowledge base returns relevant information, use that information in your response.

When using knowledge base tools, make sure to:
1. Use the exact query or related terms to search the knowledge base
2. Include the retrieved information in your response
3. Only use information from the knowledge base
4. Provide practical gameplay advice based on the retrieved data
"""


app = BedrockAgentCoreApp()


# Create and run the Gameplay agent
@app.entrypoint
def gameplay_agent(payload):
    """
    Creates and runs a gameplay agent connected to the New World Knowledge Base
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

            # Agent: Create the gameplay agent
            agent = Agent(
                tools=kb_tools,
                model=bedrock_model,
                system_prompt=GAMEPLAY_AGENT_PROMPT
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
