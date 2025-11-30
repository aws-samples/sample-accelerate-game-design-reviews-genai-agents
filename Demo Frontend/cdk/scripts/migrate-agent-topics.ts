/**
 * Migration script to update agentTopic field in existing messages
 * 
 * This script updates messages with old agent topic names to new names:
 * - 'analyst' -> 'strategic' (old Analyst agent is now Strategic)
 * - 'analysis' -> 'analyst' (old Analysis agent is now Analyst)
 * 
 * Run with: npx tsx cdk/scripts/migrate-agent-topics.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Get table name from environment or use default
const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME || 'Message-REPLACE_WITH_YOUR_TABLE_SUFFIX';

async function migrateAgentTopics() {
  console.log('Starting agent topic migration...');
  console.log(`Table: ${MESSAGE_TABLE}`);
  
  let updatedCount = 0;
  let scannedCount = 0;
  let lastEvaluatedKey: any = undefined;
  
  try {
    do {
      // Scan the table
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: MESSAGE_TABLE,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      
      const items = scanResult.Items || [];
      scannedCount += items.length;
      
      console.log(`Scanned ${items.length} items...`);
      
      // Process each message
      for (const item of items) {
        const oldTopic = item.agentTopic;
        let newTopic: string | null = null;
        
        // Determine if migration is needed
        if (oldTopic === 'analyst') {
          newTopic = 'strategic';
        } else if (oldTopic === 'analysis') {
          newTopic = 'analyst';
        }
        
        // Update if needed
        if (newTopic) {
          console.log(`Updating message ${item.id}: ${oldTopic} -> ${newTopic}`);
          
          try {
            await docClient.send(
              new UpdateCommand({
                TableName: MESSAGE_TABLE,
                Key: { id: item.id },
                UpdateExpression: 'SET agentTopic = :newTopic, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                  ':newTopic': newTopic,
                  ':updatedAt': new Date().toISOString(),
                },
              })
            );
            
            updatedCount++;
          } catch (updateError) {
            console.error(`Failed to update message ${item.id}:`, updateError);
          }
        }
      }
      
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
      
    } while (lastEvaluatedKey);
    
    console.log('\n=== Migration Complete ===');
    console.log(`Total messages scanned: ${scannedCount}`);
    console.log(`Messages updated: ${updatedCount}`);
    console.log(`Messages unchanged: ${scannedCount - updatedCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateAgentTopics()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
