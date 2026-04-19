import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

export { DynamoDBClient, PutItemCommand, ScanCommand };

export type { ScanCommandOutput } from '@aws-sdk/client-dynamodb';

export interface WeatherRecord {
  pk: string;
  sk: string;
  territory: string;
  territoryName: string;
  location: string;
  date: string;
  stationId: string;
  stationName: string;
  precipitation: number;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
}

export function createClient(): DynamoDBClient {
  const clientConfig: any = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  if (process.env.DYNAMODB_ENDPOINT) {
    clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return new DynamoDBClient(clientConfig);
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

export async function saveWeatherRecord(record: WeatherRecord): Promise<void> {
  const client = createClient();
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
  const client = createClient();
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
  const client = createClient();

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

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