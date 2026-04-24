import { Station, StationResponse, StationsResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

function getYesterdayDate(): string {
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

export async function fetchStations(): Promise<Station[]> {
  const response = await fetch(`${API_BASE_URL}/stations`);
  if (!response.ok) {
    throw new Error('Failed to fetch stations');
  }
  const data: StationsResponse = await response.json();
  return data.stations;
}

export async function fetchStationData(stationId: string, days: number = 7): Promise<StationResponse> {
  const until = getYesterdayDate();
  const response = await fetch(`${API_BASE_URL}/stations/${stationId}?days=${days}&until=${until}`);
  if (!response.ok) {
    throw new Error('Failed to fetch station data');
  }
  return response.json();
}