import { Station, StationResponse, StationsResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

export async function fetchStations(): Promise<Station[]> {
  const response = await fetch(`${API_BASE_URL}/stations`);
  if (!response.ok) {
    throw new Error('Failed to fetch stations');
  }
  const data: StationsResponse = await response.json();
  return data.stations;
}

export async function fetchStationData(stationId: string, days: number = 7): Promise<StationResponse> {
  const response = await fetch(`${API_BASE_URL}/stations/${stationId}?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch station data');
  }
  return response.json();
}