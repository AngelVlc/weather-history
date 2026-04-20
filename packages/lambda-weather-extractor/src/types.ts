export { WeatherRecord } from '@weather-history/shared-types';

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