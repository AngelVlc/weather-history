import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { createClient } from '@weather-history/shared-dynamodb-client';
import { WeatherRecord } from '@weather-history/shared-types';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

let client: DynamoDBClient | null = null;

export async function saveWeatherRecord(record: WeatherRecord): Promise<void> {
  if (!client) {
    client = createClient();
  }

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

export type { WeatherRecord } from '@weather-history/shared-types';
