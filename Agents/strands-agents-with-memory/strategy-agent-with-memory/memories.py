# Import the necessary components
from strands import Agent, tool
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider
from strands.hooks import AfterInvocationEvent, HookProvider, HookRegistry
from strands.hooks import AgentInitializedEvent, HookProvider, HookRegistry, MessageAddedEvent
from bedrock_agentcore.memory import MemoryClient
import logging

# Global agent instance - will be initialized with first request
agent = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger("agentcore-memory")
   
class LTMemoryHookProvider(HookProvider):
    """Hook provider for automatic memory management"""
    
    def __init__(self, memory_id: str, client: MemoryClient):
        self.memory_id = memory_id
        self.client = client
    
    def save_memories(self, event: AfterInvocationEvent):
        """Save conversation after agent response"""
        try:
            messages = event.agent.messages
            if len(messages) >= 2:
                # Get last user and assistant messages
                user_msg = None
                assistant_msg = None
                
                for msg in reversed(messages):
                    if not msg.get("content") or len(msg["content"]) == 0:
                        continue
                    if msg["role"] == "assistant" and not assistant_msg:
                        assistant_msg = msg["content"][0].get("text")
                    elif msg["role"] == "user" and not user_msg:
                        if "toolResult" not in msg["content"][0]:
                            user_msg = msg["content"][0].get("text")
                        if user_msg:
                            break
                
                if user_msg and assistant_msg:
                    # Get session info from agent state
                    actor_id = event.agent.state.get("actor_id")
                    session_id = event.agent.state.get("session_id")
                    
                    if not actor_id or not session_id:
                        logger.warning("Missing actor_id or session_id in agent state")
                        return
                    
                    # Save conversation
                    self.client.create_event(
                        memory_id=self.memory_id,
                        actor_id=actor_id,
                        session_id=session_id,
                        messages=[(user_msg, "USER"), (assistant_msg, "ASSISTANT")]
                    )
                    logger.info("Saved conversation to memory")
                    
        except Exception as e:
            logger.error(f"Failed to save memories: {e}")
    
    def register_hooks(self, registry: HookRegistry) -> None:
        """Register memory hooks"""
        registry.add_callback(AfterInvocationEvent, self.save_memories)
        logger.info("Memory hooks registered")