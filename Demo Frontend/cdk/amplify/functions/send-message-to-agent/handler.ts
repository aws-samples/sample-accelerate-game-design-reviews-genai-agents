import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { randomUUID } from 'crypto';
import * as https from 'https';
import { URL } from 'url';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const lambdaClient = new LambdaClient({});

const AGENT_SESSION_TABLE = process.env.AGENT_SESSION_TABLE_NAME!;
const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME!;
const PROJECT_TABLE = process.env.PROJECT_TABLE_NAME!;
const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE_NAME!;
const APPSYNC_ENDPOINT = process.env.APPSYNC_ENDPOINT!;

// Function to call AppSync mutation from Lambda using IAM auth
async function callAppSyncMutation(mutation: string, variables: any): Promise<void> {
  if (!APPSYNC_ENDPOINT) {
    console.error('APPSYNC_ENDPOINT is not set');
    throw new Error('APPSYNC_ENDPOINT environment variable is not configured');
  }
  
  console.log('APPSYNC_ENDPOINT:', APPSYNC_ENDPOINT);
  
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

export const handler: Schema['sendMessageToAgent']['functionHandler'] = async (
  event
) => {
  // Extract parameters with defaults: topic defaults to 'gameplay', memoryEnabled defaults to true
  const { 
    sessionId, 
    content, 
    topic: topicArg,
    memoryEnabled: memoryEnabledArg 
  } = event.arguments;
  
  // Ensure non-null values with defaults
  const topic: string = topicArg ?? 'gameplay';
  const memoryEnabled: boolean = memoryEnabledArg ?? true;
  
  // Extract owner from identity - for Cognito User Pools, use username
  let owner: string | undefined;
  if (event.identity && 'sub' in event.identity) {
    owner = 'username' in event.identity ? event.identity.username : event.identity.sub;
  }

  if (!owner) {
    throw new Error('Unauthorized: No user identity found');
  }

  console.log('Sending message to agent for session:', sessionId, 'owner:', owner);

  // Verify session exists and is active
  let session: any;
  try {
    const sessionResult = await docClient.send(
      new GetCommand({
        TableName: AGENT_SESSION_TABLE,
        Key: { id: sessionId },
      })
    );

    session = sessionResult.Item;
    if (!session) {
      throw new Error('Session not found');
    }

    // Amplify stores owner as "username::sub" or just "sub"
    const sessionOwner = session.owner;
    const ownerMatches = sessionOwner === owner || 
                        sessionOwner === `${owner}::${owner}` ||
                        sessionOwner.endsWith(`::${owner}`) ||
                        sessionOwner.startsWith(`${owner}::`);

    if (!ownerMatches) {
      throw new Error('Unauthorized: You do not own this session');
    }

    if (session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }
  } catch (error: any) {
    console.error('Error verifying session:', error);
    throw new Error(`Failed to verify session: ${error.message}`);
  }

  // Get project to retrieve document
  let project: any;
  let document: any;
  try {
    const projectResult = await docClient.send(
      new GetCommand({
        TableName: PROJECT_TABLE,
        Key: { id: session.projectID },
      })
    );

    project = projectResult.Item;
    if (!project) {
      throw new Error('Project not found');
    }

    // Get the document using direct lookup via documentID
    if (project.documentID) {
      try {
        const documentResult = await docClient.send(
          new GetCommand({
            TableName: DOCUMENT_TABLE,
            Key: { id: project.documentID },
          })
        );

        if (documentResult.Item) {
          document = documentResult.Item;
          console.log('Found document:', document.id, 'Title:', document.title);
        } else {
          console.warn('Document not found with ID:', project.documentID);
        }
      } catch (docError: any) {
        console.error('Error retrieving document:', docError);
        // Continue without document
      }
    } else {
      console.warn('No documentID found for project:', session.projectID);
    }
  } catch (error: any) {
    console.error('Error retrieving project:', error);
    throw new Error(`Failed to retrieve project: ${error.message}`);
  }

  // Save user message via AppSync mutation (triggers subscription)
  const userMessageId = randomUUID();
  const now = new Date().toISOString();

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
      }
    }
  `;

  await callAppSyncMutation(createMessageMutation, {
    input: {
      id: userMessageId,
      sessionID: sessionId,
      sender: 'USER',
      content,
      timestamp: now,
      type: 'TEXT',
      agentTopic: topic,
    }
  });

  console.log('User message published via AppSync');

  // Use project's memoryEnabled setting, not the mutation argument
  const projectMemoryEnabled = project.memoryEnabled ?? false;
  console.log('Using project memory setting:', projectMemoryEnabled);

  // Invoke processor Lambda asynchronously
  const processorPayload = {
    sessionId,
    content,
    topic,
    memoryEnabled: projectMemoryEnabled,
    owner,
    projectId: session.projectID,
    userMessageId,
  };

  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: process.env.PROCESSOR_LAMBDA_NAME!,
      InvocationType: 'Event', // Async
      Payload: JSON.stringify(processorPayload),
    })
  );

  console.log('Processor Lambda invoked asynchronously');

  // Return immediately
  return {
    success: true,
    userMessageId,
  };
};
