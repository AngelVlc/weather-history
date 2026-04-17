import {
  DynamoDBClient,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { WeatherRecord } from '../types';

const clientConfig: { endpoint?: string; region: string; credentials: any } = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
};
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

const client = new DynamoDBClient(clientConfig);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

export async function saveWeatherRecord(record: WeatherRecord): Promise<void> {
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
