import { defineFunction } from '@aws-amplify/backend';

export const processAgentResponse = defineFunction({
  name: 'process-agent-response',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 300,
});
