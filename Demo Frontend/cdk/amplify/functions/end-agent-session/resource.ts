import { defineFunction } from '@aws-amplify/backend';

export const endAgentSession = defineFunction({
  name: 'end-agent-session',
  entry: './handler.ts',
  resourceGroupName: 'data',
});
