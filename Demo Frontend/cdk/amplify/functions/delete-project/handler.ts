import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const PROJECT_TABLE = process.env.PROJECT_TABLE_NAME!;
const DOCUMENT_TABLE = process.env.DOCUMENT_TABLE_NAME!;
const AGENT_SESSION_TABLE = process.env.AGENT_SESSION_TABLE_NAME!;
const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME!;
const SESSION_SUMMARY_TABLE = process.env.SESSION_SUMMARY_TABLE_NAME!;

export const handler: Schema['deleteProjectCascade']['functionHandler'] = async (
  event
) => {
  const { projectId } = event.arguments;
  
  // Extract owner from identity
  let owner: string | undefined;
  if (event.identity && 'sub' in event.identity) {
    owner = 'username' in event.identity ? event.identity.username : event.identity.sub;
  }

  if (!owner) {
    throw new Error('Unauthorized: No user identity found');
  }

  console.log('Deleting project:', projectId, 'owner:', owner);

  // Get project to verify ownership
  let project: any;
  try {
    const projectResult = await docClient.send(
      new GetCommand({
        TableName: PROJECT_TABLE,
        Key: { id: projectId },
      })
    );

    project = projectResult.Item;
    if (!project) {
      throw new Error('Project not found');
    }

    // Verify ownership
    const projectOwner = project.owner;
    const ownerMatches = projectOwner === owner || 
                        projectOwner === `${owner}::${owner}` ||
                        projectOwner.endsWith(`::${owner}`) ||
                        projectOwner.startsWith(`${owner}::`);

    if (!ownerMatches) {
      throw new Error('Unauthorized: You do not own this project');
    }
  } catch (error: any) {
    console.error('Error verifying project:', error);
    throw new Error(`Failed to verify project: ${error.message}`);
  }

  try {
    // 1. Get all sessions for this project (with GSI fallback)
    let sessions: any[] = [];
    
    try {
      // Try with GSI - Amplify naming pattern
      const sessionsResult = await docClient.send(
        new QueryCommand({
          TableName: AGENT_SESSION_TABLE,
          IndexName: 'sessionsByProjectIDAndStartedAt',
          KeyConditionExpression: 'projectID = :projectId',
          ExpressionAttributeValues: {
            ':projectId': projectId,
          },
        })
      );
      sessions = sessionsResult.Items || [];
      console.log(`Found ${sessions.length} sessions using GSI`);
    } catch (gsiError) {
      // Fallback to scan
      console.log('GSI not available, using scan fallback');
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: AGENT_SESSION_TABLE,
          FilterExpression: 'projectID = :projectId',
          ExpressionAttributeValues: {
            ':projectId': projectId,
          },
        })
      );
      sessions = scanResult.Items || [];
      console.log(`Found ${sessions.length} sessions using scan`);
    }

    // 2. For each session, delete messages and summaries
    for (const session of sessions) {
      const sessionId = session.id;

      // Delete messages for this session (with GSI fallback)
      let messages: any[] = [];
      try {
        const messagesResult = await docClient.send(
          new QueryCommand({
            TableName: MESSAGE_TABLE,
            IndexName: 'messagesBySessionIDAndTimestamp',
            KeyConditionExpression: 'sessionID = :sessionId',
            ExpressionAttributeValues: {
              ':sessionId': sessionId,
            },
          })
        );
        messages = messagesResult.Items || [];
      } catch (gsiError) {
        const scanResult = await docClient.send(
          new ScanCommand({
            TableName: MESSAGE_TABLE,
            FilterExpression: 'sessionID = :sessionId',
            ExpressionAttributeValues: {
              ':sessionId': sessionId,
            },
          })
        );
        messages = scanResult.Items || [];
      }
      
      console.log(`Found ${messages.length} messages to delete for session ${sessionId}`);

      // Batch delete messages (max 25 per batch)
      if (messages.length > 0) {
        for (let i = 0; i < messages.length; i += 25) {
          const batch = messages.slice(i, i + 25);
          await docClient.send(
            new BatchWriteCommand({
              RequestItems: {
                [MESSAGE_TABLE]: batch.map(msg => ({
                  DeleteRequest: {
                    Key: { id: msg.id },
                  },
                })),
              },
            })
          );
        }
      }

      // Delete session summary if exists (with GSI fallback)
      let summaries: any[] = [];
      try {
        const summariesResult = await docClient.send(
          new QueryCommand({
            TableName: SESSION_SUMMARY_TABLE,
            IndexName: 'summariesByAgentSessionID',
            KeyConditionExpression: 'agentSessionID = :sessionId',
            ExpressionAttributeValues: {
              ':sessionId': sessionId,
            },
          })
        );
        summaries = summariesResult.Items || [];
      } catch (gsiError) {
        const scanResult = await docClient.send(
          new ScanCommand({
            TableName: SESSION_SUMMARY_TABLE,
            FilterExpression: 'agentSessionID = :sessionId',
            ExpressionAttributeValues: {
              ':sessionId': sessionId,
            },
          })
        );
        summaries = scanResult.Items || [];
      }

      for (const summary of summaries) {
        await docClient.send(
          new DeleteCommand({
            TableName: SESSION_SUMMARY_TABLE,
            Key: { id: summary.id },
          })
        );
      }

      // Delete the session itself
      await docClient.send(
        new DeleteCommand({
          TableName: AGENT_SESSION_TABLE,
          Key: { id: sessionId },
        })
      );
    }

    // 3. Delete the document if exists
    if (project.documentID) {
      try {
        await docClient.send(
          new DeleteCommand({
            TableName: DOCUMENT_TABLE,
            Key: { id: project.documentID },
          })
        );
        console.log('Deleted document:', project.documentID);
      } catch (docError) {
        console.error('Error deleting document:', docError);
        // Continue even if document deletion fails
      }
    }

    // 4. Finally, delete the project
    await docClient.send(
      new DeleteCommand({
        TableName: PROJECT_TABLE,
        Key: { id: projectId },
      })
    );

    console.log('Successfully deleted project and all associated data:', projectId);

    return {
      id: projectId,
      name: project.name,
      deleted: true,
    };
  } catch (error: any) {
    console.error('Error during cascading delete:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
};
