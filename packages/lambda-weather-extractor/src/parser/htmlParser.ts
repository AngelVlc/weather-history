import * as cheerio from 'cheerio';
import { StationData } from '../types';

export function parseWeatherTable(
  html: string,
  territory: string,
  date: string
): StationData[] {
  const $ = cheerio.load(html);
  const stations: StationData[] = [];

  $('table.tDades tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 5) {
      const stationLink = $(cells[0]).find('a');
      const stationName = stationLink.clone().children().remove().end().text().trim();

      const stationIdMatch = stationLink.attr('href')?.match(/id=(.+)$/);
      const stationId = stationIdMatch ? stationIdMatch[1] : '';

      if (!stationId || stationIdMatch === undefined) {
        return;
      }

      const tempMin = parseTemperature($(cells[1]).text());
      const tempAvg = parseTemperature($(cells[2]).text());
      const tempMax = parseTemperature($(cells[3]).text());
      const precipitation = parsePrecipitation($(cells[5]).text());

      stations.push({
        stationId,
        stationName,
        tempMin,
        tempMax,
        tempAvg,
        precipitation,
      });
    }
  });

  return stations;
}

function parseTemperature(text: string): number {
  const cleaned = text.trim().replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

function parsePrecipitation(text: string): number {
  const cleaned = text.trim().replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}
