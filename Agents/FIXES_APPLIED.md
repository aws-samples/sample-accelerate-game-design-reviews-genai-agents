# Fixes Applied to Basic Agents (No Memories)

## Issues Fixed:
1. **MCP Client Session Conflicts** - Moved `kb_client` creation inside entrypoint function
2. **Timeout Issues** - Added 300 second read timeout to boto3 client
3. **Silent Failures** - Removed try/except blocks that swallowed exceptions
4. **Conditional Returns** - Removed length checks that prevented returns

## Files Modified:

### All Sub-Agents (lore, gameplay, strategy):
- Moved `kb_client = MCPClient(...)` from module level into the entrypoint function
- Changed return logic to always return `result` instead of conditional returns

### Orchestrator (game-analyst-agent):
- `invoke_agent_utils.py`: Added `Config(read_timeout=300)` and removed exception swallowing
- `game_analyst_agent.py`: Removed try/except blocks from tool functions

## To Apply to Memory Agents:
The memory agents in `strands-agents-with-memory/` need the same fixes applied.
