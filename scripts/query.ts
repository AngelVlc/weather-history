import * as readline from 'readline';
import { DynamoDBClient, ScanCommand, ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { createClient } from '@weather-history/shared-dynamodb-client';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

interface Args {
  'page-size': number;
  'start-date'?: string;
  'end-date'?: string;
  stations?: string;
  order?: 'asc' | 'desc';
  raw?: boolean;
  missing?: boolean;
  help: boolean;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

let client: DynamoDBClient;
let allItems: any[] = [];
let currentIndex = 0;

async function fetchAllData(
  stations?: string[],
  startDate?: string,
  endDate?: string,
  order: 'asc' | 'desc' = 'desc'
): Promise<void> {
  let lastKey: Record<string, any> | undefined;
  const items: any[] = [];

  const territory = stations && stations[0] ? stations[0].substring(0, 3) : null;

  do {
    const params: any = {
      TableName: TABLE_NAME,
      Limit: 1000,
    };

    const filters: string[] = [];
    const values: Record<string, any> = {};

    if (stations && stations.length > 0) {
      const stationFilters = stations.map((_, i) => `sk = :station${i}`);
      filters.push(`(${stationFilters.join(' OR ')})`);
      stations.forEach((station, i) => {
        values[`:station${i}`] = { S: station };
      });
    }
    if (territory && startDate) {
      filters.push('pk >= :startPk');
      values[':startPk'] = { S: `${territory}#${startDate}` };
    }
    if (territory && endDate) {
      filters.push('pk <= :endPk');
      values[':endPk'] = { S: `${territory}#${endDate}` };
    }

    if (filters.length > 0) {
      params.FilterExpression = filters.join(' AND ');
      params.ExpressionAttributeValues = values;
    }

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const command = new ScanCommand(params);
    const result: ScanCommandOutput = await client.send(command);

    if (result.Items) {
      items.push(...result.Items);
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  items.sort((a, b) => {
    const pkA = a.pk?.S || '';
    const pkB = b.pk?.S || '';
    return order === 'desc' ? pkB.localeCompare(pkA) : pkA.localeCompare(pkB);
  });

  allItems = items;
}

function getNextPage(pageSize: number): { items: any[]; hasMore: boolean } {
  const items = allItems.slice(currentIndex, currentIndex + pageSize);
  currentIndex += pageSize;
  const hasMore = currentIndex < allItems.length;
  return { items, hasMore };
}

async function query(
  pageSize: number = 10,
  stations?: string[],
  startDate?: string,
  endDate?: string,
  order: 'asc' | 'desc' = 'desc',
  raw: boolean = false
): Promise<{ hasMore: boolean }> {
  if (allItems.length === 0) {
    console.log('  Fetching all data and sorting...');
    await fetchAllData(stations, startDate, endDate, order);
    console.log(`  Loaded ${allItems.length} records`);
  }

  const { items, hasMore } = getNextPage(pageSize);

  if (items.length > 0) {
    console.log('\n--- Records ---\n');
    for (const item of items) {
      if (raw) {
        console.log(JSON.stringify(item, null, 2));
        console.log('');
      } else {
        const pk = item.pk?.S || '';
        const sk = item.sk?.S || '';
        const territory = item.territory?.S || '';
        const territoryName = item.territoryName?.S || '';
        const date = item.date?.S || '';
        const stationName = item.stationName?.S || '';
        const precipitation = item.precipitation?.N || '0';
        const tempMin = item.tempMin?.N || '0';
        const tempMax = item.tempMax?.N || '0';
        const tempAvg = item.tempAvg?.N || '0';

        console.log(`PK: ${pk}`);
        console.log(`  SK: ${sk}`);
        console.log(`  Territory: ${territory} (${territoryName})`);
        console.log(`  Date: ${date}`);
        console.log(`  Station: ${stationName}`);
        console.log(`  Precipitation: ${precipitation}mm`);
        console.log(`  Temp: ${tempMin}°C / ${tempMax}°C / ${tempAvg}°C`);
        console.log('');
      }
    }

    return { hasMore };
  }

  console.log('No records found.\n');
  return { hasMore: false };
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getMissingDates(
  allDatesInRange: string[],
  dbDates: Set<string>
): string[] {
  return allDatesInRange.filter(date => !dbDates.has(date));
}

async function main() {
  const argv = require('yargs')
    .option('page-size', {
      describe: 'Number of records per page',
      type: 'number',
      default: 10,
    })
    .option('start-date', {
      describe: 'Filter by start date (YYYY-MM-DD)',
      type: 'string',
    })
    .option('end-date', {
      describe: 'Filter by end date (YYYY-MM-DD)',
      type: 'string',
    })
    .option('stations', {
      describe: 'Comma-separated list of station IDs to filter',
      type: 'string',
    })
    .option('order', {
      describe: 'Sort order by date',
      type: 'string',
      choices: ['asc', 'desc'],
      default: 'desc',
    })
    .option('raw', {
      describe: 'Show raw DynamoDB items',
      type: 'boolean',
      default: false,
    })
    .option('missing', {
      describe: 'Show missing dates in range (requires --start-date, --end-date and --stations)',
      type: 'boolean',
      default: false,
    })
    .help()
    .alias('h', 'help')
    .parseSync() as Args;

  client = createClient();

  const stations = argv.stations ? argv.stations.split(',').map(s => s.trim()) : undefined;

  if (argv.missing) {
    if (!argv['start-date'] || !argv['end-date']) {
      console.error('Error: --missing requires --start-date and --end-date');
      process.exit(1);
    }
    if (!stations || stations.length === 0) {
      console.error('Error: --missing requires --stations');
      process.exit(1);
    }

    console.log('\nFetching existing dates...');
    await fetchAllData(stations, argv['start-date'], argv['end-date'], 'asc');

    const datesInRange = getDatesInRange(argv['start-date'], argv['end-date']);
    const existingDates = new Set(allItems.map(item => item.date?.S));
    const missing = getMissingDates(datesInRange, existingDates);

    console.log('\n--- Missing dates ---\n');
    for (const date of missing) {
      console.log(date);
    }
    console.log(`\nTotal: ${missing.length} of ${datesInRange.length} dates missing`);

    console.log('\n--- Commands to populate missing dates ---\n');
    for (const station of stations) {
      for (const date of missing) {
        console.log(`yarn populate --start-date ${date} --end-date ${date} --stations ${station}`);
      }
    }

    rl.close();
    console.log('Query completed.');
    return;
  }

  console.log('DynamoDB Endpoint:', process.env.DYNAMODB_ENDPOINT || 'AWS (production)');
  console.log('DynamoDB Table:', TABLE_NAME);
  console.log(`Page size: ${argv['page-size']}`);
  if (stations) console.log(`Stations: ${stations.join(', ')}`);
  if (argv['start-date']) console.log(`Start Date: ${argv['start-date']}`);
  if (argv['end-date']) console.log(`End Date: ${argv['end-date']}`);
  console.log(`Order: ${argv.order}`);
  if (argv.raw) console.log(`Raw: true`);
  console.log('\nPress Enter for next page, "q" to quit.\n');

  let shouldQuit = false;

  while (!shouldQuit) {
    const { hasMore } = await query(
      argv['page-size'],
      stations,
      argv['start-date'],
      argv['end-date'],
      argv.order,
      argv.raw
    );

    if (!hasMore) {
      console.log('--- End of results ---\n');
      break;
    }

    try {
      const answer = await new Promise<string>((resolve) => {
        rl.question('Next page? (Enter/q): ', resolve);
      });

      if (answer.toLowerCase() === 'q') {
        shouldQuit = true;
      }
    } catch {
      console.log('(input closed, exiting)\n');
      break;
    }
  }

  rl.close();
  console.log('Query completed.');
}

main().catch((error) => {
  console.error('Query failed:', error.message || error);
  process.exit(1);
});