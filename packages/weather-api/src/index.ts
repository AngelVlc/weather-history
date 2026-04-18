import { LambdaEvent, LambdaResponse, Station, StationData, StationResponse, StationsResponse } from './types';
import { scanAllStations, queryStationData } from './dynamodb/client';

interface ApiGatewayEvent {
  path?: string;
  rawPath?: string;
  queryStringParameters?: Record<string, string> | null;
  pathParameters?: Record<string, string> | null;
  requestContext?: Record<string, any>;
}

export const handler = async (event: LambdaEvent | ApiGatewayEvent): Promise<LambdaResponse> => {
  console.log('Event received:', JSON.stringify(event));

  // Support both Lambda Function URL (rawPath) and API Gateway (path)
  const path = (event as any).rawPath || (event as any).path || '/';
  const queryStringParameters = (event as any).queryStringParameters || {};
  const pathParameters = (event as any).pathParameters || {};

  if (path === '/stations') {
    return getStationsHandler();
  }

  const stationIdMatch = path.match(/^\/stations\/([^/]+)$/);
  if (stationIdMatch) {
    const stationId = stationIdMatch[1];
    const days = parseInt(queryStringParameters?.days || '7', 10);
    return await getStationDataHandler(stationId, days);
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found' }),
  };
};

async function getStationsHandler(): Promise<LambdaResponse> {
  try {
    const items = await scanAllStations();

    const stationMap = new Map<string, Station>();
    for (const item of items) {
      if (!stationMap.has(item.stationId)) {
        stationMap.set(item.stationId, {
          id: item.stationId,
          name: item.stationName,
          territory: item.territoryName,
        });
      }
    }

    const stations: Station[] = Array.from(stationMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const response: StationsResponse = { stations };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=21600',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error in getStationsHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function getStationDataHandler(stationId: string, days: number): Promise<LambdaResponse> {
  try {
    const items = await queryStationData(stationId, days);

    if (items.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Station not found' }),
      };
    }

    const data: StationData[] = items.map((item) => ({
      date: item.date,
      tempMax: item.tempMax,
      tempMin: item.tempMin,
      tempAvg: item.tempAvg,
      precipitation: item.precipitation,
    }));

    const firstItem = items[0];
    const response: StationResponse = {
      stationId: firstItem.stationId,
      stationName: firstItem.stationName,
      territory: firstItem.territory,
      territoryName: firstItem.territoryName,
      data,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=7200',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error in getStationDataHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}