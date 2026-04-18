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

export interface Station {
  id: string;
  name: string;
  territory: string;
}

export interface StationData {
  date: string;
  tempMax: number;
  tempMin: number;
  tempAvg: number;
  precipitation: number;
}

export interface StationResponse {
  stationId: string;
  stationName: string;
  territory: string;
  territoryName: string;
  data: StationData[];
}

export interface StationsResponse {
  stations: Station[];
}

export interface LambdaEvent {
  rawPath: string;
  queryStringParameters: Record<string, string> | null;
  requestContext: {
    accountId: string;
    apiId: string;
    domainName: string;
    requestId: string;
  };
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}