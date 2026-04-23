import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { createClient } from '@weather-history/shared-dynamodb-client';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

let client: DynamoDBClient | null = null;

export function getClient(): DynamoDBClient {
  if (!client) {
    client = createClient();
  }
  return client;
}

export async function checkRecordExists(pk: string, sk: string): Promise<boolean> {
  const command = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: { S: pk },
      sk: { S: sk },
    },
  });

  const result = await getClient().send(command);
  return result.Item !== undefined;
}