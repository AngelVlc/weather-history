import { EventBridgeEvent, WeatherRecord } from './types';
import { fetchWeatherPage } from './httpClient';
import { parseWeatherTable } from './parser/htmlParser';
import { saveWeatherRecords } from './dynamodb/client';

export const handler = async (event: EventBridgeEvent): Promise<void> => {
  console.log('Event received:', JSON.stringify(event));

  const { territory, territoryName } = event;
  const date = getYesterdayDate();
  const pk = `${territory}#${date}`;

  console.log(
    `Processing territory: ${territory} (${territoryName}) for date: ${date}`
  );

  const html = await fetchWeatherPage(territory, date);
  console.log(`Fetched HTML, length: ${html.length} characters`);

  const stationData = parseWeatherTable(html, territory, date);
  console.log(`Parsed ${stationData.length} stations`);

  const records: WeatherRecord[] = stationData.map((station) => ({
    pk,
    sk: station.stationId,
    territory,
    territoryName,
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
