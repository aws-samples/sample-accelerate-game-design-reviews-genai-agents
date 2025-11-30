
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


# Prompt: System prompt for the Lore agent
LORE_AGENT_PROMPT = """
You are a New World Lore Expert specializing in the rich narrative and world-building of New World built by Amazon Game Studios. Your expertise includes:
- The history and origins of Aeternum, the mysterious island setting
- The Corruption and its impact on the world and its inhabitants
- The Ancient Guardians and their role in Aeternum's past
- The various factions and their motivations (Covenant, Marauders, Syndicate)
- Key characters, NPCs, and their backstories
- The lore behind locations, settlements, and landmarks
- The mythology and supernatural elements of the world
- Historical events and timeline of Aeternum
- The relationship between the living, the dead, and the Corrupted

ALWAYS use the available knowledge base tools to retrieve information before answering questions. If the knowledge base returns relevant information, use that information in your response.

When using knowledge base tools, make sure to:
1. Use the exact query or related terms to search the knowledge base
2. Include the retrieved information in your response
3. Only use information from the knowledge base
4. Provide detailed lore explanations and narrative context based on the retrieved data
5. Connect different lore elements to create a cohesive understanding of the world
"""


app = BedrockAgentCoreApp()


# Create and run the Lore agent
@app.entrypoint
def lore_agent(payload):
    """
    Creates and runs a lore agent connected to the New World Knowledge Base
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

            # Agent: Create the lore agent
            agent = Agent(
                tools=kb_tools,
                model=bedrock_model,
                system_prompt=LORE_AGENT_PROMPT
            )

            user_input = payload.get("prompt")
            response = agent(user_input)
            return response.message['content'][0]['text']

    except Exception as e:
        print(f"Error accessing Knowledge Base: {e}")
        return f"error {e}"

if __name__ == "__main__":
    app.run()
