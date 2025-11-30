# Memory Agent Permission Fixes

## Problem
Memory-based agents were experiencing permission errors when trying to access their memories:
```
AccessDeniedException: User is not authorized to perform: bedrock-agentcore:CreateEvent
```

## Root Causes

### 1. Incomplete IAM Permissions
The memory agent IAM roles were missing critical permissions that the working non-memory agents had:
- Knowledge base permissions (GetKnowledgeBase, Rerank, ListDataSources)
- S3 and S3 Vectors permissions
- ECR permissions
- CloudWatch and X-Ray permissions
- Workload identity permissions

### 2. Hardcoded Memory ID Placeholders
Agent code files had placeholder strings like `{gameplay_project_memory_id}` instead of actual memory IDs.

## Fixes Applied

### 1. IAM Permission Updates
**Script**: `fix_memory_agent_permissions.py`

Updated all memory agent roles with complete permissions:
- `agentcore-gameplay_agent_mem-role`
- `agentcore-lore_agent_mem-role`
- `agentcore-strategy_agent_mem-role`
- `agentcore-game_analyst_mem-role`

**Key additions**:
- Full knowledge base access (Retrieve, Rerank, GetKnowledgeBase, ListDataSources)
- S3 and S3Vectors permissions for vector search
- ECR image access for container operations
- CloudWatch Logs and X-Ray tracing
- Workload identity token access
- SSM Parameter Store access

### 2. Memory ID Fixes
Updated agent code files with actual memory IDs:

**Gameplay Agent** (`gameplay_agent.py`):
```python
project_memory_id = "Project_gameplay_597edeef-XOt1OmF0Zd"
```

**Lore Agent** (`lore_agent.py`):
```python
project_memory_id = "Project_lore_78f09820-iidpdZ4wfj"
```

**Strategy Agent** (`strategy_agent.py`):
```python
project_memory_id = "Project_strategy_3443cbe2-0vOWxMHl4Y"
```

**Game Analyst Agent** (`game_analyst_agent.py`):
- Already had correct IDs:
  - `user_prefs_memory_id = "GameAnalystUserPrefs_37d1e66e-Ytm1ni3Db5"`
  - `session_memory_id = "GameAnalystShortTermMemory_6502d2be-wJVopQEE4H"`

### 3. Deploy Script Update
**File**: `deploy_with_memories.py`

Updated the `create_agentcore_role()` function to:
- Use policy name `AgentCorePolicy` (matching non-memory agents)
- Include all necessary permissions from working agents
- Properly append memory-specific permissions

## Verification Steps

1. Check IAM role policies:
```bash
aws iam get-role-policy --role-name agentcore-gameplay_agent_mem-role --policy-name AgentCorePolicy
```

2. Test agent invocation:
```python
invoke_response = gameplay_agentcore_runtime.invoke({
    "prompt": "What are factions in new world?",
    "project_id": "new-world-aternum"
})
```

3. Check CloudWatch logs for successful memory operations (no AccessDenied errors)

## Files Modified

1. `/Agents/fix_memory_agent_permissions.py` (new)
2. `/Agents/deploy_with_memories.py` (updated)
3. `/Agents/strands-agents-with-memory/gameplay-agent-with-memory/gameplay_agent.py`
4. `/Agents/strands-agents-with-memory/lore-agent-with-memory/lore_agent.py`
5. `/Agents/strands-agents-with-memory/strategy-agent-with-memory/strategy_agent.py`

## Next Steps

After these fixes, you should:
1. Redeploy the memory agents using the updated code
2. Test each agent to verify memory operations work correctly
3. Monitor CloudWatch logs for any remaining permission issues

## Prevention

For future agent deployments:
- Use the updated `deploy_with_memories.py` script
- Ensure memory IDs are properly substituted (not left as placeholders)
- Compare IAM policies with working agents before deployment
