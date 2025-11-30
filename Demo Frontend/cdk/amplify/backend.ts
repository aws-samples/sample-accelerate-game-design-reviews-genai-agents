import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { startAgentSession } from './functions/start-agent-session/resource';
import { sendMessageToAgent } from './functions/send-message-to-agent/resource';
import { processAgentResponse } from './functions/process-agent-response/resource';
import { endAgentSession } from './functions/end-agent-session/resource';
import { deleteProject } from './functions/delete-project/resource';

// Agent ARNs for dynamic agent selection (8 agents: 4 topics x 2 memory modes)
// These will be loaded from environment variables
const GAMEPLAY_NO_MEMORY_AGENT_ARN = process.env.GAMEPLAY_NO_MEMORY_AGENT_ARN || '';
const LORE_NO_MEMORY_AGENT_ARN = process.env.LORE_NO_MEMORY_AGENT_ARN || '';
const ANALYST_NO_MEMORY_AGENT_ARN = process.env.ANALYST_NO_MEMORY_AGENT_ARN || '';
const ANALYSIS_NO_MEMORY_AGENT_ARN = process.env.ANALYSIS_NO_MEMORY_AGENT_ARN || '';
const GAMEPLAY_MEMORY_AGENT_ARN = process.env.GAMEPLAY_MEMORY_AGENT_ARN || '';
const LORE_MEMORY_AGENT_ARN = process.env.LORE_MEMORY_AGENT_ARN || '';
const ANALYST_MEMORY_AGENT_ARN = process.env.ANALYST_MEMORY_AGENT_ARN || '';
const ANALYSIS_MEMORY_AGENT_ARN = process.env.ANALYSIS_MEMORY_AGENT_ARN || '';

// Extract agent IDs from ARNs for backward compatibility
// ARN format: arn:aws:bedrock-agentcore:region:account:runtime/agent_name-ID
const extractAgentId = (arn: string): string => {
  if (!arn) return '';
  const match = arn.match(/runtime\/[^-]+-([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
};

const GAMEPLAY_NO_MEMORY_AGENT_ID = extractAgentId(GAMEPLAY_NO_MEMORY_AGENT_ARN);
const LORE_NO_MEMORY_AGENT_ID = extractAgentId(LORE_NO_MEMORY_AGENT_ARN);
const ANALYST_NO_MEMORY_AGENT_ID = extractAgentId(ANALYST_NO_MEMORY_AGENT_ARN);
const ANALYSIS_NO_MEMORY_AGENT_ID = extractAgentId(ANALYSIS_NO_MEMORY_AGENT_ARN);
const GAMEPLAY_MEMORY_AGENT_ID = extractAgentId(GAMEPLAY_MEMORY_AGENT_ARN);
const LORE_MEMORY_AGENT_ID = extractAgentId(LORE_MEMORY_AGENT_ARN);
const ANALYST_MEMORY_AGENT_ID = extractAgentId(ANALYST_MEMORY_AGENT_ARN);
const ANALYSIS_MEMORY_AGENT_ID = extractAgentId(ANALYSIS_MEMORY_AGENT_ARN);

const backend = defineBackend({
  auth,
  data,
  startAgentSession,
  sendMessageToAgent,
  processAgentResponse,
  endAgentSession,
  deleteProject,
});

// Configure Cognito advanced security
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.userPoolAddOns = {
  advancedSecurityMode: 'ENFORCED',
};

// Get DynamoDB table names from the data construct
const projectTable = backend.data.resources.tables['Project'];
const documentTable = backend.data.resources.tables['Document'];
const agentSessionTable = backend.data.resources.tables['AgentSession'];
const messageTable = backend.data.resources.tables['Message'];
const sessionSummaryTable = backend.data.resources.tables['SessionSummary'];

// Pass Agent Core agent ARNs to Lambda functions
// Add all 8 agent ARNs for dynamic agent selection
backend.startAgentSession.addEnvironment('GAMEPLAY_NO_MEMORY_AGENT_ARN', GAMEPLAY_NO_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('LORE_NO_MEMORY_AGENT_ARN', LORE_NO_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('ANALYST_NO_MEMORY_AGENT_ARN', ANALYST_NO_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('ANALYSIS_NO_MEMORY_AGENT_ARN', ANALYSIS_NO_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('GAMEPLAY_MEMORY_AGENT_ARN', GAMEPLAY_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('LORE_MEMORY_AGENT_ARN', LORE_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('ANALYST_MEMORY_AGENT_ARN', ANALYST_MEMORY_AGENT_ARN);
backend.startAgentSession.addEnvironment('ANALYSIS_MEMORY_AGENT_ARN', ANALYSIS_MEMORY_AGENT_ARN);

// Add 8 agent IDs for dynamic agent selection
backend.startAgentSession.addEnvironment('GAMEPLAY_NO_MEMORY_AGENT_ID', GAMEPLAY_NO_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('LORE_NO_MEMORY_AGENT_ID', LORE_NO_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('ANALYST_NO_MEMORY_AGENT_ID', ANALYST_NO_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('ANALYSIS_NO_MEMORY_AGENT_ID', ANALYSIS_NO_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('GAMEPLAY_MEMORY_AGENT_ID', GAMEPLAY_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('LORE_MEMORY_AGENT_ID', LORE_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('ANALYST_MEMORY_AGENT_ID', ANALYST_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('ANALYSIS_MEMORY_AGENT_ID', ANALYSIS_MEMORY_AGENT_ID);
backend.startAgentSession.addEnvironment('PROCESSOR_LAMBDA_NAME', backend.processAgentResponse.resources.lambda.functionName);

// Add 8 agent ARNs for dynamic agent selection
backend.sendMessageToAgent.addEnvironment('GAMEPLAY_NO_MEMORY_AGENT_ARN', GAMEPLAY_NO_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('LORE_NO_MEMORY_AGENT_ARN', LORE_NO_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('ANALYST_NO_MEMORY_AGENT_ARN', ANALYST_NO_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('ANALYSIS_NO_MEMORY_AGENT_ARN', ANALYSIS_NO_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('GAMEPLAY_MEMORY_AGENT_ARN', GAMEPLAY_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('LORE_MEMORY_AGENT_ARN', LORE_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('ANALYST_MEMORY_AGENT_ARN', ANALYST_MEMORY_AGENT_ARN);
backend.sendMessageToAgent.addEnvironment('ANALYSIS_MEMORY_AGENT_ARN', ANALYSIS_MEMORY_AGENT_ARN);

// Add 8 agent IDs for dynamic agent selection (extracted from ARNs)
backend.sendMessageToAgent.addEnvironment('GAMEPLAY_NO_MEMORY_AGENT_ID', GAMEPLAY_NO_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('LORE_NO_MEMORY_AGENT_ID', LORE_NO_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('ANALYST_NO_MEMORY_AGENT_ID', ANALYST_NO_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('ANALYSIS_NO_MEMORY_AGENT_ID', ANALYSIS_NO_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('GAMEPLAY_MEMORY_AGENT_ID', GAMEPLAY_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('LORE_MEMORY_AGENT_ID', LORE_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('ANALYST_MEMORY_AGENT_ID', ANALYST_MEMORY_AGENT_ID);
backend.sendMessageToAgent.addEnvironment('ANALYSIS_MEMORY_AGENT_ID', ANALYSIS_MEMORY_AGENT_ID);

// Pass DynamoDB table names to all Lambda functions
backend.startAgentSession.addEnvironment('PROJECT_TABLE_NAME', projectTable.tableName);
backend.startAgentSession.addEnvironment('DOCUMENT_TABLE_NAME', documentTable.tableName);
backend.startAgentSession.addEnvironment('AGENT_SESSION_TABLE_NAME', agentSessionTable.tableName);
backend.startAgentSession.addEnvironment('MESSAGE_TABLE_NAME', messageTable.tableName);

backend.sendMessageToAgent.addEnvironment('PROJECT_TABLE_NAME', projectTable.tableName);
backend.sendMessageToAgent.addEnvironment('DOCUMENT_TABLE_NAME', documentTable.tableName);
backend.sendMessageToAgent.addEnvironment('AGENT_SESSION_TABLE_NAME', agentSessionTable.tableName);
backend.sendMessageToAgent.addEnvironment('MESSAGE_TABLE_NAME', messageTable.tableName);
backend.sendMessageToAgent.addEnvironment('PROCESSOR_LAMBDA_NAME', backend.processAgentResponse.resources.lambda.functionName);

// Add AppSync endpoint - use the GraphQL API URL from CDK
// The graphQlUrl property is available on the CfnGraphQLApi
const graphqlUrl = backend.data.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl;
backend.sendMessageToAgent.addEnvironment('APPSYNC_ENDPOINT', graphqlUrl);

// Add all agent ARNs to processor Lambda
backend.processAgentResponse.addEnvironment('GAMEPLAY_NO_MEMORY_AGENT_ARN', GAMEPLAY_NO_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('LORE_NO_MEMORY_AGENT_ARN', LORE_NO_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('ANALYST_NO_MEMORY_AGENT_ARN', ANALYST_NO_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('ANALYSIS_NO_MEMORY_AGENT_ARN', ANALYSIS_NO_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('GAMEPLAY_MEMORY_AGENT_ARN', GAMEPLAY_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('LORE_MEMORY_AGENT_ARN', LORE_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('ANALYST_MEMORY_AGENT_ARN', ANALYST_MEMORY_AGENT_ARN);
backend.processAgentResponse.addEnvironment('ANALYSIS_MEMORY_AGENT_ARN', ANALYSIS_MEMORY_AGENT_ARN);

backend.processAgentResponse.addEnvironment('PROJECT_TABLE_NAME', projectTable.tableName);
backend.processAgentResponse.addEnvironment('DOCUMENT_TABLE_NAME', documentTable.tableName);
backend.processAgentResponse.addEnvironment('AGENT_SESSION_TABLE_NAME', agentSessionTable.tableName);
backend.processAgentResponse.addEnvironment('MESSAGE_TABLE_NAME', messageTable.tableName);

// Add AppSync endpoint - reuse the same graphqlUrl variable from above
backend.processAgentResponse.addEnvironment('APPSYNC_ENDPOINT', graphqlUrl);

backend.endAgentSession.addEnvironment('AGENT_SESSION_TABLE_NAME', agentSessionTable.tableName);
backend.endAgentSession.addEnvironment('MESSAGE_TABLE_NAME', messageTable.tableName);
backend.endAgentSession.addEnvironment('SESSION_SUMMARY_TABLE_NAME', sessionSummaryTable.tableName);

backend.deleteProject.addEnvironment('PROJECT_TABLE_NAME', projectTable.tableName);
backend.deleteProject.addEnvironment('DOCUMENT_TABLE_NAME', documentTable.tableName);
backend.deleteProject.addEnvironment('AGENT_SESSION_TABLE_NAME', agentSessionTable.tableName);
backend.deleteProject.addEnvironment('MESSAGE_TABLE_NAME', messageTable.tableName);
backend.deleteProject.addEnvironment('SESSION_SUMMARY_TABLE_NAME', sessionSummaryTable.tableName);

// Grant DynamoDB permissions to Lambda functions
projectTable.grantReadWriteData(backend.startAgentSession.resources.lambda);
documentTable.grantReadData(backend.startAgentSession.resources.lambda);
agentSessionTable.grantReadWriteData(backend.startAgentSession.resources.lambda);
messageTable.grantWriteData(backend.startAgentSession.resources.lambda);

projectTable.grantReadData(backend.sendMessageToAgent.resources.lambda);
documentTable.grantReadData(backend.sendMessageToAgent.resources.lambda);
agentSessionTable.grantReadData(backend.sendMessageToAgent.resources.lambda);

projectTable.grantReadWriteData(backend.processAgentResponse.resources.lambda);
documentTable.grantReadData(backend.processAgentResponse.resources.lambda);
agentSessionTable.grantReadData(backend.processAgentResponse.resources.lambda);
messageTable.grantReadData(backend.processAgentResponse.resources.lambda);

agentSessionTable.grantReadWriteData(backend.endAgentSession.resources.lambda);
messageTable.grantReadData(backend.endAgentSession.resources.lambda);
sessionSummaryTable.grantWriteData(backend.endAgentSession.resources.lambda);

projectTable.grantReadWriteData(backend.deleteProject.resources.lambda);
documentTable.grantReadWriteData(backend.deleteProject.resources.lambda);
agentSessionTable.grantReadWriteData(backend.deleteProject.resources.lambda);
messageTable.grantReadWriteData(backend.deleteProject.resources.lambda);
sessionSummaryTable.grantReadWriteData(backend.deleteProject.resources.lambda);

// Build list of all 8 agent ARNs for IAM permissions
// Use wildcard pattern to match all runtime resources in the region
// This covers both the base runtime ARN and runtime-endpoint paths
const agentArns = [
  GAMEPLAY_NO_MEMORY_AGENT_ARN,
  LORE_NO_MEMORY_AGENT_ARN,
  ANALYST_NO_MEMORY_AGENT_ARN,
  ANALYSIS_NO_MEMORY_AGENT_ARN,
  GAMEPLAY_MEMORY_AGENT_ARN,
  LORE_MEMORY_AGENT_ARN,
  ANALYST_MEMORY_AGENT_ARN,
  ANALYSIS_MEMORY_AGENT_ARN,
].filter(arn => arn && arn.length > 0); // Filter out empty ARNs

// Grant invoke permissions for all 8 agents
// Use wildcard for all bedrock-agentcore runtime resources
// This is necessary because the actual resource ARN includes additional path segments
const agentResources = agentArns.length > 0 
  ? ['arn:aws:bedrock-agentcore:us-west-2:582048091268:runtime/*']
  : ['*'];

// Grant permissions to invoke Agent Core agents
const startSessionLambda = backend.startAgentSession.resources.lambda;

// Allow startAgentSession to invoke processor Lambda for initial document analysis
startSessionLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [backend.processAgentResponse.resources.lambda.functionArn],
  })
);

const sendMessageLambda = backend.sendMessageToAgent.resources.lambda;
const processAgentLambda = backend.processAgentResponse.resources.lambda;

// Allow sendMessage to invoke processor Lambda
sendMessageLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [processAgentLambda.functionArn],
  })
);

// Allow sendMessage to call AppSync
sendMessageLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [`${backend.data.resources.graphqlApi.arn}/*`],
  })
);

// Allow processor to call Bedrock
processAgentLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'bedrock-agentcore:InvokeAgentRuntime',
      'bedrock:InvokeAgent',
      'bedrock:InvokeModel',
      'bedrock:Retrieve',
      'bedrock:RetrieveAndGenerate',
    ],
    resources: agentResources,
  })
);

// Allow processor to call AppSync
processAgentLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [`${backend.data.resources.graphqlApi.arn}/*`],
  })
);



