import { EventBridgeEvent, WeatherRecord } from './types';
import { fetchWeatherPage } from './httpClient';
import { parseWeatherTable } from './parser/htmlParser';
import { saveWeatherRecords } from './dynamodb/client';

export const handler = async (event: EventBridgeEvent): Promise<void> => {
  console.log('Event received:', JSON.stringify(event));

  const { territory, territoryName, location, stationIds } = event;
  const date = getYesterdayDate();
  const pk = `${territory}#${date}`;

  console.log(
    `Processing territory: ${territory} (${territoryName}) for location: ${location}, date: ${date}`
  );
  console.log(`Filtering for stations: ${stationIds.join(', ')}`);

  const html = await fetchWeatherPage(territory, date);
  console.log(`Fetched HTML, length: ${html.length} characters`);

  const allStationData = parseWeatherTable(html, territory, date);
  console.log(`Parsed ${allStationData.length} stations total`);

  const filteredStationData = allStationData.filter((station) =>
    stationIds.includes(station.stationId)
  );
  console.log(`Filtered to ${filteredStationData.length} matching stations`);

  const records: WeatherRecord[] = filteredStationData.map((station) => ({
    pk,
    sk: station.stationId,
    territory,
    territoryName,
    location,
    date,
    stationId: station.stationId,
    stationName: station.stationName,
    precipitation: station.precipitation,
    tempMin: station.tempMin,
    tempMax: station.tempMax,
    tempAvg: station.tempAvg,
  }));

  if (records.length > 0) {
    await saveWeatherRecords(records);
    console.log(`Saved ${records.length} records to DynamoDB`);
  } else {
    console.log('No records to save');
  }
};

export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function getDateFromString(dateStr: string): string {
  return dateStr.split('T')[0];
}
