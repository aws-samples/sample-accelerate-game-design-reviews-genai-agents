import { defineFunction } from '@aws-amplify/backend';

export const sendMessageToAgent = defineFunction({
  name: 'send-message-to-agent',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 300
});
