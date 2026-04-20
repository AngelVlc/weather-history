import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { createClient } from '@weather-history/shared-dynamodb-client';
import { WeatherRecord, StationInfo } from '@weather-history/shared-types';

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

export async function scanAllStations(): Promise<StationInfo[]> {
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

  const stationMap = new Map<string, StationInfo>();
  for (const item of items) {
    if (!stationMap.has(item.stationId)) {
      stationMap.set(item.stationId, {
        stationId: item.stationId,
        stationName: item.stationName,
        territory: item.territory,
        territoryName: item.territoryName,
      });
    }
  }

  return Array.from(stationMap.values());
}

export async function queryStationData(
  stationId: string,
  days: number
): Promise<WeatherRecord[]> {
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
