import { LambdaEvent, LambdaResponse, Station, StationData, StationResponse, StationsResponse } from './types';
import { getYesterdayDate } from '@weather-history/shared-types';
import { scanAllStations, queryStationData } from './dynamodb/client';

interface ApiGatewayEvent {
  path?: string;
  rawPath?: string;
  queryStringParameters?: Record<string, string> | null;
  pathParameters?: Record<string, string> | null;
  requestContext?: Record<string, any>;
}

export const handler = async (event: LambdaEvent | ApiGatewayEvent): Promise<LambdaResponse> => {
  const startTime = Date.now();

  console.log('Event received:', JSON.stringify(event));

  const path = (event as any).rawPath || (event as any).path || '/';
  const method = (event as any).httpMethod || (event as any).requestContext?.http?.method || 'GET';
  const queryStringParameters = (event as any).queryStringParameters || {};
  const pathParameters = (event as any).pathParameters || {};

  let response: LambdaResponse;

  if (path === '/stations') {
    response = await getStationsHandler();
  } else {
    const stationIdMatch = path.match(/^\/stations\/([^/]+)$/);
    if (stationIdMatch) {
      const stationId = stationIdMatch[1];
      const days = parseInt(queryStringParameters?.days || '7', 10);
      const until = queryStringParameters?.until;
      response = await getStationDataHandler(stationId, days, until, path);
    } else {
      response = {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
  }

  const queryString = Object.keys(queryStringParameters).length > 0
    ? '?' + new URLSearchParams(queryStringParameters).toString()
    : '';
  console.log(`Started ${method} ${path}${queryString} - Status: ${response.statusCode} - Latency: ${Date.now() - startTime}ms`);

  return response;
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

async function getStationDataHandler(
  stationId: string,
  days: number,
  untilParam: string | undefined,
  currentPath: string
): Promise<LambdaResponse> {
  try {
    const until = untilParam || getYesterdayDate();

    const items = await queryStationData(stationId, days, until);

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
      days,
      until,
      data,
    };

    if (!untilParam) {
      const redirectUrl = `${currentPath}?days=${days}&until=${until}`;
      return {
        statusCode: 307,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60',
          'Location': redirectUrl,
        },
        body: JSON.stringify(response),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, immutable',
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