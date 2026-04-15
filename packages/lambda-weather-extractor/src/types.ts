export interface Territory {
  id: string;
  name: string;
  location: string;
  cronHour: number;
  timezone: string;
  stationIds: string[];
}

export interface TerritoryConfig {
  territories: Territory[];
}

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

export interface StationData {
  stationId: string;
  stationName: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  precipitation: number;
}

export interface EventBridgeEvent {
  territory: string;
  territoryName: string;
  location: string;
  stationIds: string[];
}
