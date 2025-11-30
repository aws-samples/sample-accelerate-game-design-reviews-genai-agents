import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import * as https from 'https';
import { URL } from 'url';

// Configure Bedrock client with extended timeouts and no retries
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

const AGENT_SESSION_TABLE = process.env.AGENT_SESSION_TABLE_NAME!;
const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME!;
const PROJECT_TABLE = process.env.PROJECT_TABLE_NAME!;
const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE_NAME!;
const APPSYNC_ENDPOINT = process.env.APPSYNC_ENDPOINT!;

const AGENT_ARNS: Record<string, string> = {
  gameplay_no_memory: process.env.GAMEPLAY_NO_MEMORY_AGENT_ARN!,
  lore_no_memory: process.env.LORE_NO_MEMORY_AGENT_ARN!,
  analyst_no_memory: process.env.ANALYST_NO_MEMORY_AGENT_ARN!,
  analysis_no_memory: process.env.ANALYSIS_NO_MEMORY_AGENT_ARN!,
  gameplay_memory: process.env.GAMEPLAY_MEMORY_AGENT_ARN!,
  lore_memory: process.env.LORE_MEMORY_AGENT_ARN!,
  analyst_memory: process.env.ANALYST_MEMORY_AGENT_ARN!,
  analysis_memory: process.env.ANALYSIS_MEMORY_AGENT_ARN!,
};

function selectAgent(topic: string, memoryEnabled: boolean): string {
  const topicMapping: Record<string, string> = {
    'gameplay': 'gameplay',
    'lore': 'lore',
    'strategic': 'analyst',
    'analyst': 'analysis'
  };
  
  const backendTopic = topicMapping[topic.toLowerCase()] || 'analysis';
  const memorySuffix = memoryEnabled ? '_memory' : '_no_memory';
  const agentKey = `${backendTopic}${memorySuffix}`;
  
  return AGENT_ARNS[agentKey];
}

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

async function callAppSyncMutation(mutation: string, variables: any): Promise<void> {
  // Use AWS SDK to call AppSync with IAM auth
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
          console.log('AppSync mutation successful');
          resolve();
        } else {
          console.error('AppSync mutation failed:', res.statusCode, data);
          reject(new Error(`AppSync mutation failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

async function getConversationHistory(sessionId: string, limit: number = 50): Promise<any[]> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: MESSAGE_TABLE,
        FilterExpression: 'sessionID = :sessionId',
        ExpressionAttributeValues: {
          ':sessionId': sessionId,
        },
        Limit: limit,
      })
    );
    
    const messages = (result.Items || []).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return messages;
  } catch (error: any) {
    console.error('Error retrieving conversation history:', error);
    return [];
  }
}

async function getProjectDocument(projectId: string): Promise<{ title: string; content: string } | null> {
  try {
    const projectResult = await docClient.send(
      new GetCommand({
        TableName: PROJECT_TABLE,
        Key: { id: projectId },
      })
    );
    
    const project = projectResult.Item;
    if (!project || !project.documentID) {
      return null;
    }
    
    const documentResult = await docClient.send(
      new GetCommand({
        TableName: DOCUMENT_TABLE,
        Key: { id: project.documentID },
      })
    );
    
    const document = documentResult.Item;
    if (!document) {
      return null;
    }
    
    return {
      title: document.title,
      content: document.content,
    };
  } catch (error: any) {
    console.error('Error retrieving project document:', error);
    return null;
  }
}

async function buildFullContext(sessionId: string, projectId: string): Promise<string> {
  try {
    const [messages, document] = await Promise.all([
      getConversationHistory(sessionId, 50),
      getProjectDocument(projectId),
    ]);
    
    const contextParts: string[] = [];
    
    if (document) {
      contextParts.push(`=== PROJECT DOCUMENT ===`);
      contextParts.push(`Title: ${document.title}`);
      contextParts.push(`Content:\n${document.content}`);
      contextParts.push('');
    }
    
    if (messages.length > 0) {
      contextParts.push(`=== CONVERSATION HISTORY ===`);
      const historyText = messages
        .map(m => `${m.sender}: ${m.content}`)
        .join('\n');
      contextParts.push(historyText);
      contextParts.push('');
    }
    
    if (contextParts.length === 0) {
      return '=== CONTEXT ===\nNo previous context available.\n';
    }
    
    return contextParts.join('\n');
  } catch (error: any) {
    console.error('Error building full context:', error);
    return '=== CONTEXT ===\nError loading context.\n';
  }
}

export const handler = async (event: any) => {
  const { sessionId, content, topic, memoryEnabled, owner, projectId, userMessageId } = event;
  
  console.log('Processing agent for session:', sessionId);
  console.log('Topic:', topic, 'Memory enabled:', memoryEnabled, 'Type:', typeof memoryEnabled);
  
  try {
    // Select agent
    const agentArn = selectAgent(topic, memoryEnabled);
    console.log('Selected agent ARN:', agentArn);
    
    // Build prompt
    let combinedPrompt: string;
    if (memoryEnabled) {
      combinedPrompt = content;
    } else {
      const context = await buildFullContext(sessionId, projectId);
      combinedPrompt = `${context}\n\n=== CURRENT USER MESSAGE ===\n${content}`;
    }

    const payloadData = {
      prompt: combinedPrompt,
      project_id: projectId,
      user_id: owner,
    };

    const input = {
      runtimeSessionId: sessionId.padEnd(33, '0'),
      agentRuntimeArn: agentArn,
      qualifier: "DEFAULT",
      payload: JSON.stringify(payloadData)
    };
    
    console.log('Invoking agent:', agentArn.split('/').pop());
    
    const command = new InvokeAgentRuntimeCommand(input);
    const startTime = Date.now();
    const response = await agentClient.send(command);
    const endTime = Date.now();
    const invocationDurationMs = endTime - startTime;
    
    console.log('Agent responded in', invocationDurationMs, 'ms');
    
    // Log response structure to find usage information
    console.log('Response keys:', Object.keys(response));
    console.log('Response $metadata:', JSON.stringify(response.$metadata, null, 2));
    if (response.usage) {
      console.log('Response usage:', JSON.stringify(response.usage, null, 2));
    }
    if (response.performanceMetrics) {
      console.log('Performance metrics:', JSON.stringify(response.performanceMetrics, null, 2));
    }
    
    let agentResponse = '';
    if (response.response) {
      const textResponse = await response.response.transformToString();
      if (textResponse) {
        agentResponse = textResponse;
      }
    }
    
    // Estimate tokens
    // Note: For memory-enabled agents, Bedrock automatically adds memory context
    // which we cannot measure. We add a rough multiplier to account for this.
    let inputTokens = estimateTokenCount(combinedPrompt);
    if (memoryEnabled) {
      // Rough estimate: memory context typically adds 20-50% more tokens
      inputTokens = Math.ceil(inputTokens * 1.35);
    }
    const outputTokens = estimateTokenCount(agentResponse);
    
    console.log(`Agent completed in ${invocationDurationMs}ms, estimated tokens: ${inputTokens}/${outputTokens}${memoryEnabled ? ' (includes memory context estimate)' : ''}`);

    // Publish agent message via AppSync (triggers subscription)
    const agentMessageId = randomUUID();
    const agentTimestamp = new Date().toISOString();

    const createMessageMutation = `
      mutation CreateMessage($input: CreateMessageInput!) {
        createMessage(input: $input) {
          id
          sessionID
          sender
          content
          timestamp
          type
          agentTopic
          inputTokens
          outputTokens
          invocationDurationMs
        }
      }
    `;

    await callAppSyncMutation(createMessageMutation, {
      input: {
        id: agentMessageId,
        sessionID: sessionId,
        sender: 'AGENT',
        content: agentResponse,
        timestamp: agentTimestamp,
        type: 'TEXT',
        agentTopic: topic,
        inputTokens,
        outputTokens,
        invocationDurationMs,
      }
    });

    console.log('Agent message published via AppSync');

    // Update project status
    try {
      const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
      await docClient.send(
        new UpdateCommand({
          TableName: PROJECT_TABLE,
          Key: { id: projectId },
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'IN_PROGRESS',
            ':submittedStatus': 'SUBMITTED',
            ':updatedAt': new Date().toISOString(),
          },
          ConditionExpression: '#status = :submittedStatus',
        })
      );
    } catch (updateError: any) {
      if (updateError.name !== 'ConditionalCheckFailedException') {
        console.error('Error updating project status:', updateError);
      }
    }
  } catch (error: any) {
    console.error('Error processing agent response:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.$metadata) {
      console.error('Error metadata:', JSON.stringify(error.$metadata, null, 2));
    }
    
    // Publish error message
    try {
      const errorMessageId = randomUUID();
      const errorTimestamp = new Date().toISOString();
      
      const createMessageMutation = `
        mutation CreateMessage($input: CreateMessageInput!) {
          createMessage(input: $input) {
            id
          }
        }
      `;

      await callAppSyncMutation(createMessageMutation, {
        input: {
          id: errorMessageId,
          sessionID: sessionId,
          sender: 'AGENT',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: errorTimestamp,
          type: 'TEXT',
          agentTopic: topic,
          inputTokens: 0,
          outputTokens: 0,
          invocationDurationMs: 0,
        }
      });
    } catch (publishError) {
      console.error('Error publishing error message:', publishError);
    }
  }
};
