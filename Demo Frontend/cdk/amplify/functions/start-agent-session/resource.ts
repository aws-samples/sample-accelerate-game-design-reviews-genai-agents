import { defineFunction } from '@aws-amplify/backend';

export const startAgentSession = defineFunction({
  name: 'start-agent-session',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 300
});
