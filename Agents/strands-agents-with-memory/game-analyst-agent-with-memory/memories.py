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

class ShortTermMemoryHook(HookProvider):
    def __init__(self, memory_client: MemoryClient, memory_id: str):
        self.memory_client = memory_client
        self.memory_id = memory_id
    
    def on_agent_initialized(self, event: AgentInitializedEvent):
        """Load recent conversation history when agent starts"""
        try:
            # Get session info from agent state
            actor_id = event.agent.state.get("actor_id")
            session_id = event.agent.state.get("session_id")
            
            if not actor_id or not session_id:
                logger.warning("Missing actor_id or session_id in agent state")
                return
            
            # Get last 5 conversation turns
            recent_turns = self.memory_client.get_last_k_turns(
                memory_id=self.memory_id,
                actor_id=actor_id,
                session_id=session_id,
                k=5,
                branch_name="main"
            )
            
            if recent_turns:
                # Format conversation history for context
                context_messages = []
                for turn in recent_turns:
                    for message in turn:
                        role = message['role'].lower()
                        content = message['content']['text']
                        context_messages.append(f"{role.title()}: {content}")
                
                context = "\n".join(context_messages)
                logger.info(f"Context from memory: {context}")
                
                # Add context to agent's system prompt
                event.agent.system_prompt += f"\n\nRecent conversation history:\n{context}\n\nContinue the conversation naturally based on this context."
                
                logger.info(f"✅ Loaded {len(recent_turns)} recent conversation turns")
            else:
                logger.info("No previous conversation history found")
                
        except Exception as e:
            logger.error(f"Failed to load conversation history: {e}")
    
    def on_message_added(self, event: MessageAddedEvent):
        """Store conversation turns in memory"""
        messages = event.agent.messages
        try:
            # Get session info from agent state
            actor_id = event.agent.state.get("actor_id")
            session_id = event.agent.state.get("session_id")
            
            if not actor_id or not session_id:
                logger.warning("Missing actor_id or session_id in agent state")
                return
            
            self.memory_client.create_event(
                memory_id=self.memory_id,
                actor_id=actor_id,
                session_id=session_id,
                messages=[(messages[-1]["content"][0]["text"], messages[-1]["role"])]
            )
            
        except Exception as e:
            logger.error(f"Failed to store message: {e}")
    
    def register_hooks(self, registry: HookRegistry) -> None:
        # Register memory hooks
        registry.add_callback(MessageAddedEvent, self.on_message_added)
        registry.add_callback(AgentInitializedEvent, self.on_agent_initialized)
        
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