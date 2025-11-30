import { defineFunction } from '@aws-amplify/backend';

export const deleteProject = defineFunction({
  name: 'delete-project',
  entry: './handler.ts',
  resourceGroupName: 'data',
});
