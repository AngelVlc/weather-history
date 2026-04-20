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

export interface StationInfo {
  stationId: string;
  stationName: string;
  territory: string;
  territoryName: string;
}