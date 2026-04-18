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