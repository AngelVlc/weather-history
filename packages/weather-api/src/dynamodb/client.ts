import * as fs from 'fs';
import {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';

async function loadCredentials() {
  if (process.env.AWS_PROFILE) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const credentialsPath = `${homeDir}/.aws/credentials`;

    if (fs.existsSync(credentialsPath)) {
      const credsContent = fs.readFileSync(credentialsPath, 'utf8');
      const profileSection = credsContent.split(`[${process.env.AWS_PROFILE}]`)[1]?.split('[')[0] || '';
      if (profileSection) {
        const accessKeyId = profileSection.match(/aws_access_key_id\s*=\s*(\S+)/)?.[1];
        const secretAccessKey = profileSection.match(/aws_secret_access_key\s*=\s*(\S+)/)?.[1];
        if (accessKeyId && secretAccessKey) {
          return { accessKeyId, secretAccessKey };
        }
      }
    }
  }

  return fromEnv();
}

async function createClient() {
  const credentials = await loadCredentials();
  const clientConfig: any = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials,
  };

  if (process.env.DYNAMODB_ENDPOINT) {
    clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
    clientConfig.tls = false;
  }

  return new DynamoDBClient(clientConfig);
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

function unmarshallItem(item: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value?.S !== undefined) result[key] = value.S;
    else if (value?.N !== undefined) result[key] = Number(value.N);
    else if (value?.BOOL !== undefined) result[key] = value.BOOL;
    else result[key] = value;
  }
  return result;
}

export async function scanAllStations(): Promise<Record<string, any>[]> {
  const client = await createClient();
  const items: Record<string, any>[] = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const params: any = {
      TableName: TABLE_NAME,
      Limit: 1000,
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await client.send(new ScanCommand(params));
    if (result.Items) {
      items.push(...result.Items.map(unmarshallItem));
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

export async function queryStationData(
  stationId: string,
  days: number
): Promise<Record<string, any>[]> {
  const client = await createClient();
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const items: Record<string, any>[] = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const params: any = {
      TableName: TABLE_NAME,
      FilterExpression: '#sid = :sidVal AND #date >= :startDate AND #date <= :endDate',
      ExpressionAttributeNames: {
        '#sid': 'stationId',
        '#date': 'date',
      },
      ExpressionAttributeValues: {
        ':sidVal': { S: stationId },
        ':startDate': { S: startDateStr },
        ':endDate': { S: endDateStr },
      },
      Limit: 1000,
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await client.send(new ScanCommand(params));
    if (result.Items) {
      items.push(...result.Items.map(unmarshallItem));
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items.sort((a, b) => b.date.localeCompare(a.date));
}