import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const AGENT_SESSION_TABLE = process.env.AGENT_SESSION_TABLE_NAME!;
const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME!;
const SESSION_SUMMARY_TABLE = process.env.SESSION_SUMMARY_TABLE_NAME!;

// Helper function to generate summary from messages
async function generateSummary(sessionId: string, owner: string): Promise<any> {
  try {
    // Try to query messages using GSI, fall back to scan if index doesn't exist yet
    let messages: any[] = [];
    
    try {
      // Try with the GSI that Amplify creates
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
      console.log(`Found ${messages.length} messages using GSI`);
    } catch (gsiError: any) {
      // If GSI doesn't exist yet, use scan as fallback
      console.log('GSI not available, using scan fallback');
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
      console.log(`Found ${messages.length} messages using scan`);
    }
    
    // Filter out system messages and organize by sender
    const userMessages = messages.filter(m => m.sender === 'USER' && m.type !== 'SYSTEM');
    const agentMessages = messages.filter(m => m.sender === 'AGENT' && m.type !== 'SYSTEM');

    // Generate summary data
    const findings: string[] = [];
    const recommendations: string[] = [];
    const keyInsights: string[] = [];
    const conversationHighlights: string[] = [];

    // Extract findings and recommendations from agent messages
    agentMessages.forEach((msg, index) => {
      const content = msg.content || '';
      
      // Look for patterns that indicate findings
      if (content.toLowerCase().includes('found') || 
          content.toLowerCase().includes('identified') ||
          content.toLowerCase().includes('discovered')) {
        findings.push(content); // Keep full content
      }
      
      // Look for patterns that indicate recommendations
      if (content.toLowerCase().includes('recommend') || 
          content.toLowerCase().includes('suggest') ||
          content.toLowerCase().includes('should')) {
        recommendations.push(content); // Keep full content
      }
      
      // Extract key insights from longer agent responses
      if (content.length > 100 && index < 5) {
        keyInsights.push(content); // Keep full content
      }
    });

    // Create conversation highlights from user-agent exchanges
    for (let i = 0; i < Math.min(3, userMessages.length); i++) {
      const userMsg = userMessages[i];
      const correspondingAgent = agentMessages.find(a => 
        new Date(a.timestamp).getTime() > new Date(userMsg.timestamp).getTime()
      );
      
      if (correspondingAgent) {
        conversationHighlights.push(
          `Q: ${userMsg.content}\n\nA: ${correspondingAgent.content}` // Keep full content with better formatting
        );
      }
    }

    // If no specific patterns found, use general message content
    if (findings.length === 0 && agentMessages.length > 0) {
      findings.push(`Session included ${messages.length} messages with ${userMessages.length} user questions.`);
    }

    if (keyInsights.length === 0 && agentMessages.length > 0) {
      keyInsights.push(`Conversation covered ${agentMessages.length} agent responses.`);
    }

    // Create the summary record
    const summaryId = randomUUID();
    const now = new Date().toISOString();
    
    const summary = {
      id: summaryId,
      agentSessionID: sessionId,
      findings: findings.slice(0, 10), // Limit to 10 items
      recommendations: recommendations.slice(0, 10),
      keyInsights: keyInsights.slice(0, 5),
      conversationHighlights: conversationHighlights.slice(0, 5),
      owner,
      createdAt: now,
      updatedAt: now,
    };

    // Save summary to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: SESSION_SUMMARY_TABLE,
        Item: summary,
      })
    );

    console.log('Summary created successfully:', summaryId);
    return summary;
  } catch (error: any) {
    console.error('Error generating summary:', error);
    // Don't fail the session end if summary generation fails
    return null;
  }
}

export const handler: Schema['endAgentSession']['functionHandler'] = async (
  event
) => {
  const { sessionId } = event.arguments;
  
  // Extract owner from identity - for Cognito User Pools, use username
  let owner: string | undefined;
  if (event.identity && 'sub' in event.identity) {
    owner = 'username' in event.identity ? event.identity.username : event.identity.sub;
  }

  if (!owner) {
    throw new Error('Unauthorized: No user identity found');
  }

  console.log('Ending agent session:', sessionId, 'owner:', owner);

  // Get session to verify ownership
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
  } catch (error: any) {
    console.error('Error verifying session:', error);
    throw new Error(`Failed to verify session: ${error.message}`);
  }

  // Generate summary before ending session
  await generateSummary(sessionId, owner);

  // Update session status
  const now = new Date().toISOString();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: AGENT_SESSION_TABLE,
        Key: { id: sessionId },
        UpdateExpression: 'SET #status = :status, endedAt = :endedAt, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'COMPLETED',
          ':endedAt': now,
          ':updatedAt': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    console.log('Session ended successfully:', sessionId);

    return result.Attributes as any;
  } catch (error: any) {
    console.error('Error ending session:', error);
    throw new Error(`Failed to end session: ${error.message}`);
  }
};
