import type { Schema } from '../../data/resource';
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { randomUUID } from 'crypto';
import * as https from 'https';
import { URL } from 'url';

// Configure Bedrock client with extended timeouts
// Set timeout at multiple levels to ensure it takes effect
const agentClient = new BedrockAgentCoreClient({
  requestHandler: {
    httpOptions: {
      timeout: 300000,  // 5 minutes
      connectTimeout: 30000, // 30 seconds
    },
    requestTimeout: 300000,
    connectionTimeout: 30000,
  },
  requestTimeout: 300000, // Also set at client level
  maxAttempts: 1,
});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const lambdaClient = new LambdaClient({});

const AGENT_SESSION_TABLE = process.env.AGENT_SESSION_TABLE_NAME!;
const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME!;
const PROJECT_TABLE = process.env.PROJECT_TABLE_NAME!;
const APPSYNC_ENDPOINT = process.env.APPSYNC_ENDPOINT!;
const PROCESSOR_LAMBDA_NAME = process.env.PROCESSOR_LAMBDA_NAME!;

// Function to call AppSync mutation from Lambda using IAM auth
async function callAppSyncMutation(mutation: string, variables: any): Promise<void> {
  const { SignatureV4 } = await import('@smithy/signature-v4');
  const { Sha256 } = await import('@aws-crypto/sha256-js');
  const { HttpRequest } = await import('@smithy/protocol-http');
  const { defaultProvider } = await import('@aws-sdk/credential-provider-node');
  
  const url = new URL(APPSYNC_ENDPOINT);
  const requestBody = JSON.stringify({
    query: mutation,
    variables
  });

  const request = new HttpRequest({
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: url.hostname,
    },
    body: requestBody,
  });

  const signer = new SignatureV4({
    service: 'appsync',
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: defaultProvider(),
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: signedRequest.hostname,
      path: signedRequest.path,
      method: signedRequest.method,
      headers: signedRequest.headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`AppSync mutation failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// Agent ARN configuration object - maps topic and memory mode to agent ARNs
const AGENT_ARNS = {
  gameplay_no_memory: process.env.GAMEPLAY_NO_MEMORY_AGENT_ARN!,
  lore_no_memory: process.env.LORE_NO_MEMORY_AGENT_ARN!,
  analyst_no_memory: process.env.ANALYST_NO_MEMORY_AGENT_ARN!,
  analysis_no_memory: process.env.ANALYSIS_NO_MEMORY_AGENT_ARN!,
  gameplay_memory: process.env.GAMEPLAY_MEMORY_AGENT_ARN!,
  lore_memory: process.env.LORE_MEMORY_AGENT_ARN!,
  analyst_memory: process.env.ANALYST_MEMORY_AGENT_ARN!,
  analysis_memory: process.env.ANALYSIS_MEMORY_AGENT_ARN!,
};

// Agent ID configuration object
const AGENT_IDS = {
  gameplay_no_memory: process.env.GAMEPLAY_NO_MEMORY_AGENT_ID!,
  lore_no_memory: process.env.LORE_NO_MEMORY_AGENT_ID!,
  analyst_no_memory: process.env.ANALYST_NO_MEMORY_AGENT_ID!,
  analysis_no_memory: process.env.ANALYSIS_NO_MEMORY_AGENT_ID!,
  gameplay_memory: process.env.GAMEPLAY_MEMORY_AGENT_ID!,
  lore_memory: process.env.LORE_MEMORY_AGENT_ID!,
  analyst_memory: process.env.ANALYST_MEMORY_AGENT_ID!,
  analysis_memory: process.env.ANALYSIS_MEMORY_AGENT_ID!,
};

/**
 * Selects the appropriate agent ARN and ID based on topic and memory mode
 */
function selectAgent(topic: string, memoryEnabled: boolean): { arn: string; id: string } {
  const validTopics = ['gameplay', 'lore', 'strategic', 'analyst'];
  
  let normalizedTopic = topic.toLowerCase();
  if (!validTopics.includes(normalizedTopic)) {
    console.warn(`Invalid topic: ${topic}, defaulting to analyst`);
    normalizedTopic = 'analyst';
  }
  
  // Map new topic names to backend agent keys
  // 'strategic' maps to old 'analyst' agent
  // 'analyst' maps to old 'analysis' agent
  const topicMapping: Record<string, string> = {
    'gameplay': 'gameplay',
    'lore': 'lore',
    'strategic': 'analyst',  // Strategic uses the analyst agent
    'analyst': 'analysis'     // Analyst uses the analysis agent
  };
  
  const backendTopic = topicMapping[normalizedTopic] || 'analysis';
  
  const memorySuffix = memoryEnabled ? '_memory' : '_no_memory';
  const agentKey = `${backendTopic}${memorySuffix}` as keyof typeof AGENT_ARNS;
  
  const agentArn = AGENT_ARNS[agentKey];
  const agentId = AGENT_IDS[agentKey];
  
  if (!agentArn || !agentArn.startsWith('arn:aws:bedrock')) {
    throw new Error(`Invalid agent ARN format for key ${agentKey}: ${agentArn}`);
  }
  
  console.log(`Selected agent: ${agentKey} -> ARN: ${agentArn}, ID: ${agentId}`);
  return { arn: agentArn, id: agentId };
}

/**
 * Interface for agent metrics
 */
interface AgentMetrics {
  inputTokens: number;
  outputTokens: number;
  invocationDurationMs: number;
}

/**
 * Extracts metrics from Bedrock Agent response
 */
function extractMetrics(response: any, duration: number): AgentMetrics {
  const defaultMetrics: AgentMetrics = {
    inputTokens: 0,
    outputTokens: 0,
    invocationDurationMs: duration,
  };
  
  try {
    const usage = response?.usage || response?.$metadata?.usage;
    
    if (usage) {
      return {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        invocationDurationMs: duration,
      };
    }
    
    return defaultMetrics;
  } catch (error: any) {
    console.error('Error extracting metrics:', error);
    return defaultMetrics;
  }
}

export const handler: Schema['startAgentSession']['functionHandler'] = async (
  event
) => {
  const { projectId, selectedAgents, memoryEnabled, sessionType } = event.arguments;
  
  // Default values if not provided, filter out null/undefined values
  const agents = selectedAgents && selectedAgents.length > 0 
    ? selectedAgents.filter((a): a is string => a !== null && a !== undefined)
    : ['analysis'];
  const useMemory = memoryEnabled !== null && memoryEnabled !== undefined ? memoryEnabled : true;
  const sessionTypeValue = sessionType || 'INITIAL';
  
  // Extract owner from identity - for Cognito User Pools, use username
  let owner: string | undefined;
  if (event.identity && 'sub' in event.identity) {
    // For Cognito User Pools, the owner field is set to the username
    owner = 'username' in event.identity ? event.identity.username : event.identity.sub;
  }

  if (!owner) {
    throw new Error('Unauthorized: No user identity found');
  }

  console.log('Starting agent session for project:', projectId, 'owner:', owner);
  console.log('Identity:', JSON.stringify(event.identity, null, 2));

  // Verify project exists and user has access
  let project: any;
  let document: any;
  try {
    const projectResult = await docClient.send(
      new GetCommand({
        TableName: PROJECT_TABLE,
        Key: { id: projectId },
      })
    );

    if (!projectResult.Item) {
      throw new Error('Project not found');
    }

    project = projectResult.Item;
    console.log('Project owner:', project.owner);
    console.log('Current user:', owner);
    
    // Amplify stores owner as "username::sub" or just "sub"
    // Check if owner matches either format
    const projectOwner = project.owner;
    const ownerMatches = projectOwner === owner || 
                        projectOwner === `${owner}::${owner}` ||
                        projectOwner.endsWith(`::${owner}`) ||
                        projectOwner.startsWith(`${owner}::`);
    
    console.log('Owner match:', ownerMatches);

    if (!ownerMatches) {
      throw new Error(`Unauthorized: You do not own this project. Project owner: ${projectOwner}, Your ID: ${owner}`);
    }

    // Get the document associated with the project using direct lookup
    if (project.documentID) {
      const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE_NAME!;
      
      try {
        const documentResult = await docClient.send(
          new GetCommand({
            TableName: DOCUMENT_TABLE,
            Key: { id: project.documentID },
          })
        );

        if (documentResult.Item) {
          document = documentResult.Item;
          console.log('Found document for session:', document.id, 'Title:', document.title);
        } else {
          console.warn('Document not found with ID:', project.documentID);
        }
      } catch (docError: any) {
        console.error('Error retrieving document:', docError);
        // Don't fail session creation if document retrieval fails
      }
    } else {
      console.warn('No documentID found for project:', projectId);
    }
  } catch (error: any) {
    console.error('Error verifying project:', error);
    throw new Error(`Failed to verify project: ${error.message}`);
  }

  // Create new agent session
  const sessionId = randomUUID();
  const now = new Date().toISOString();

  const session = {
    id: sessionId,
    projectID: projectId,
    startedAt: now,
    status: 'ACTIVE' as const,
    sessionType: sessionTypeValue as 'INITIAL' | 'FOLLOWUP',
    owner,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: AGENT_SESSION_TABLE,
        Item: session,
      })
    );

    console.log('Created agent session:', sessionId);
  } catch (error: any) {
    console.error('Error creating session:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  // Create initial system message
  const systemMessageId = randomUUID();
  let systemMessageContent = 'Agent session started. Analyzing your document...';
  
  if (document) {
    systemMessageContent = `Agent session started. Analyzing "${document.title}"...`;
  }
  
  const systemMessage = {
    id: systemMessageId,
    sessionID: sessionId,
    sender: 'AGENT' as const,
    content: systemMessageContent,
    timestamp: now,
    type: 'SYSTEM' as const,
    owner,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: MESSAGE_TABLE,
        Item: systemMessage,
      })
    );

    console.log('Created initial system message:', systemMessageId);
  } catch (error: any) {
    console.error('Error creating system message:', error);
    // Don't fail the session creation if message creation fails
  }

  // If document exists, invoke processor Lambda for each selected agent asynchronously
  if (document && agents.length > 0) {
    console.log(`Queuing ${agents.length} agent(s) for initial document analysis...`);
    console.log(`Selected agents: ${agents.join(', ')}, Memory enabled: ${useMemory}`);
    
    // Build the initial analysis prompt
    const initialPrompt = `
DOCUMENT TITLE: ${document.title}
DOCUMENT TYPE: ${document.type}

DOCUMENT CONTENT:
${document.content}

---

TASK: Please provide an initial analysis of this document. Give me a brief overview of the key points, main themes, and any important insights you can identify.
`.trim();
    
    // Invoke processor Lambda asynchronously for each agent
    for (const agentTopic of agents) {
      try {
        console.log(`Queuing ${agentTopic} agent for processing...`);
        
        const processorPayload = {
          sessionId,
          content: initialPrompt,
          topic: agentTopic,
          memoryEnabled: useMemory,
          owner,
          projectId,
          userMessageId: systemMessageId, // Use system message ID as reference
        };

        await lambdaClient.send(
          new InvokeCommand({
            FunctionName: PROCESSOR_LAMBDA_NAME,
            InvocationType: 'Event', // Async invocation
            Payload: JSON.stringify(processorPayload),
          })
        );

        console.log(`${agentTopic} agent queued for processing`);
      } catch (error: any) {
        console.error(`Error queuing ${agentTopic} agent:`, error);
      }
    }
  }

  return session;
};
