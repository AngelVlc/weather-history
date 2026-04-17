import * as fs from 'fs';
import {
  DynamoDBClient,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { WeatherRecord } from '../types';

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

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return { accessKeyId: 'dummy', secretAccessKey: 'dummy' };
}

async function createClient() {
  const credentials = await loadCredentials();
  const clientConfig: any = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials,
  };

  if (process.env.DYNAMODB_ENDPOINT) {
    clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  return new DynamoDBClient(clientConfig);
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

export async function saveWeatherRecord(record: WeatherRecord): Promise<void> {
  const client = await createClient();
  const command = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: { S: record.pk },
      sk: { S: record.sk },
      territory: { S: record.territory },
      territoryName: { S: record.territoryName },
      location: { S: record.location },
      date: { S: record.date },
      stationId: { S: record.stationId },
      stationName: { S: record.stationName },
      precipitation: { N: record.precipitation.toString() },
      tempMin: { N: record.tempMin.toString() },
      tempMax: { N: record.tempMax.toString() },
      tempAvg: { N: record.tempAvg.toString() },
    },
  });

  await client.send(command);
}

export async function saveWeatherRecords(
  records: WeatherRecord[]
): Promise<void> {
  await Promise.all(records.map((record) => saveWeatherRecord(record)));
}