import * as fs from 'fs';
import * as path from 'path';
import { fetchWeatherPage } from '../packages/lambda-weather-extractor/src/httpClient';
import { parseWeatherTable } from '../packages/lambda-weather-extractor/src/parser/htmlParser';
import { saveWeatherRecords, WeatherRecord } from '../packages/lambda-weather-extractor/src/dynamodb/client';

interface Args {
  'start-date': string;
  'end-date'?: string;
  local: boolean;
  sleep: number;
  help: boolean;
}

interface Territory {
  id: string;
  name: string;
  location: string;
  cronHour: number;
  timezone: string;
  stationIds: string[];
}

interface TerritoryConfig {
  territories: Territory[];
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

async function populate(
  startDate: string,
  endDate: string,
  territories: Territory[],
  sleepSeconds: number
): Promise<void> {
  const dates = getDatesInRange(startDate, endDate);
  console.log(
    `Populating ${dates.length} day(s) for ${territories.length} territory(ies)`
  );

  let totalRecords = 0;

  for (const date of dates) {
    console.log(`\n--- Processing date: ${date} ---`);

    for (const territory of territories) {
      console.log(`  Fetching data for territory: ${territory.id} (${territory.name})`);

      try {
        const html = await fetchWeatherPage(territory.id, date);
        console.log(`    Fetched HTML, length: ${html.length} characters`);

        if (sleepSeconds > 0) {
          console.log(`    Sleeping ${sleepSeconds}s...`);
          await new Promise((resolve) => setTimeout(resolve, sleepSeconds * 1000));
        }

        const allStationData = parseWeatherTable(html, territory.id, date);
        console.log(`    Parsed ${allStationData.length} stations total`);

        const filteredStationData = allStationData.filter((station) =>
          territory.stationIds.includes(station.stationId)
        );
        console.log(`    Filtered to ${filteredStationData.length} matching stations`);

        const pk = `${territory.id}#${date}`;
        const records: WeatherRecord[] = filteredStationData.map((station) => ({
          pk,
          sk: station.stationId,
          territory: territory.id,
          territoryName: territory.name,
          location: territory.location,
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
          console.log(`    Saved ${records.length} records to DynamoDB`);
          totalRecords += records.length;
        } else {
          console.log(`    No records to save`);
        }
      } catch (error) {
        console.error(
          `    Error processing territory ${territory.id} for date ${date}:`,
          error
        );
      }
    }
  }

  console.log(`\n=== Total records saved: ${totalRecords} ===`);
}

function loadTerritories(): Territory[] {
  const configPath = path.join(__dirname, '..', 'config', 'territories.yaml');
  const yamlContent = fs.readFileSync(configPath, 'utf8');

  const match = yamlContent.match(/territories:\s*([\s\S]*?)$/);
  if (!match) {
    throw new Error('Invalid territories.yaml format');
  }

  const territoriesBlock = match[1];
  const territories: Territory[] = [];

  const territoryRegex = /-\s*id:\s*(\w+)\s*name:\s*(.+)\s*location:\s*(.+)\s*cronHour:\s*(\d+)\s*timezone:\s*(.+)\s*stationIds:\s*([\s\S]*?)(?=\n\s*-\s*id:|$)/g;

  let match2;
  while ((match2 = territoryRegex.exec(yamlContent)) !== null) {
    const stationIds: string[] = [];
    const stationIdRegex = /-\s*(\w+)/g;
    let stationMatch;
    while ((stationMatch = stationIdRegex.exec(match2[6])) !== null) {
      stationIds.push(stationMatch[1]);
    }

    territories.push({
      id: match2[1],
      name: match2[2].trim(),
      location: match2[3].trim(),
      cronHour: parseInt(match2[4], 10),
      timezone: match2[5].trim(),
      stationIds,
    });
  }

  return territories;
}

const argv = require('yargs')
  .option('start-date', {
    describe: 'Start date (YYYY-MM-DD)',
    demandOption: true,
    type: 'string',
  })
  .option('end-date', {
    describe: 'End date (YYYY-MM-DD), defaults to start-date if not provided',
    type: 'string',
  })
  .option('local', {
    describe: 'Use local DynamoDB (requires DYNAMODB_ENDPOINT env var)',
    type: 'boolean',
    default: false,
  })
  .option('sleep', {
    describe: 'Seconds to wait between requests',
    type: 'number',
    default: 0,
  })
  .help()
  .alias('h', 'help')
  .parseSync() as Args;

const endDate = argv['end-date'] || argv['start-date'];

console.log('DynamoDB Endpoint:', process.env.DYNAMODB_ENDPOINT || 'AWS (production)');
console.log('DynamoDB Table:', process.env.DYNAMODB_TABLE_NAME || 'weather-data (default)');

const territories = loadTerritories();
console.log('Loaded territories:', territories.map((t) => t.id).join(', '));

populate(argv['start-date'], endDate, territories, argv['sleep'])
  .then(() => {
    console.log('Populate completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Populate failed:', error);
    process.exit(1);
  });