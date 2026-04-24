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

export function getYesterdayDate(): string {
  const now = new Date();
  const month = now.getMonth();
  const offsetHours = (month >= 3 && month <= 8) ? 2 : 1;
  const madridTime = new Date(now.getTime() + offsetHours * 3600000);
  const yesterday = new Date(madridTime.getTime() - 24 * 60 * 60 * 1000);
  const year = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${m}-${d}`;
}