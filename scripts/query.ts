import * as readline from 'readline';
import * as fs from 'fs';
import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';

async function loadCredentials() {
  if (process.env.AWS_PROFILE) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const credentialsPath = `${homeDir}/.aws/credentials`;

    if (fs.existsSync(credentialsPath)) {
      const credsContent = fs.readFileSync(credentialsPath, 'utf8');
      const profileSection = credsContent.split(`[${process.env.AWS_PROFILE}]`)[1]?.split('[')[0] || '';
      if (profileSection) {
        const accessKeyId = profileSection.match(/aws_access_key_id\s*=\s*(\S+)/)?.[1];
        const secretAccessKey = profileSection.match(/aws_secret_access_key\s*=\s*(\S+)/)?.[1];
        if (accessKeyId && secretAccessKey) {
          return { accessKeyId, secretAccessKey };
        }
      }
    }
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return { accessKeyId: 'dummy', secretAccessKey: 'dummy' };
}

async function createClient() {
  const credentials = await loadCredentials();
  const clientConfig: any = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials,
  };

  if (process.env.DYNAMODB_ENDPOINT) {
    clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  return new DynamoDBClient(clientConfig);
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

interface Args {
  'page-size': number;
  'start-date'?: string;
  'end-date'?: string;
  territory?: string;
  order?: 'asc' | 'desc';
  raw?: boolean;
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
  territory?: string,
  startDate?: string,
  endDate?: string,
  order: 'asc' | 'desc' = 'desc'
): Promise<void> {
  let lastKey: Record<string, any> | undefined;
  const items: any[] = [];

  do {
    const params: any = {
      TableName: TABLE_NAME,
      Limit: 1000,
    };

    const filters: string[] = [];
    const values: Record<string, any> = {};

    if (territory) {
      filters.push('begins_with(pk, :territory)');
      values[':territory'] = { S: `${territory}#` };
    }
    if (startDate) {
      filters.push('pk >= :startPk');
      values[':startPk'] = { S: `c20#${startDate}` };
    }
    if (endDate) {
      filters.push('pk <= :endPk');
      values[':endPk'] = { S: `c20#${endDate}` };
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
  territory?: string,
  startDate?: string,
  endDate?: string,
  order: 'asc' | 'desc' = 'desc',
  raw: boolean = false
): Promise<{ hasMore: boolean }> {
  if (allItems.length === 0) {
    console.log('  Fetching all data and sorting...');
    await fetchAllData(territory, startDate, endDate, order);
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
    .option('territory', {
      describe: 'Filter by territory ID (e.g., c20)',
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
    .help()
    .alias('h', 'help')
    .parseSync() as Args;

  client = await createClient();

  console.log('DynamoDB Endpoint:', process.env.DYNAMODB_ENDPOINT || 'AWS (production)');
  console.log('DynamoDB Table:', TABLE_NAME);
  console.log(`Page size: ${argv['page-size']}`);
  if (argv.territory) console.log(`Territory: ${argv.territory}`);
  if (argv['start-date']) console.log(`Start Date: ${argv['start-date']}`);
  if (argv['end-date']) console.log(`End Date: ${argv['end-date']}`);
  console.log(`Order: ${argv.order}`);
  if (argv.raw) console.log(`Raw: true`);
  console.log('\nPress Enter for next page, "q" to quit.\n');

  let shouldQuit = false;

  while (!shouldQuit) {
    const { hasMore } = await query(
      argv['page-size'],
      argv.territory,
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