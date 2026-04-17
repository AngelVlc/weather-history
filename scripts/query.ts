import * as readline from 'readline';
import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';

const clientConfig: { endpoint?: string; region: string; credentials: any } = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
};
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

const client = new DynamoDBClient(clientConfig);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

interface Args {
  limit: number;
  'start-date'?: string;
  'end-date'?: string;
  territory?: string;
  order?: 'asc' | 'desc';
  help: boolean;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function query(
  limit: number = 10,
  startKey?: Record<string, any>,
  territory?: string,
  startDate?: string,
  endDate?: string,
  order: 'asc' | 'desc' = 'desc'
): Promise<{ hasMore: boolean; lastKey?: Record<string, any> }> {
  const useIndex = !territory && (startDate || endDate) && order === 'asc';
  const useMainTableWithFilters = territory || startDate || endDate;

  const params: any = {
    TableName: TABLE_NAME,
    Limit: useIndex ? limit : (order === 'asc' ? 1000 : limit),
    ScanIndexForward: order === 'asc',
  };

  if (useIndex) {
    params.IndexName = 'date-index';
    params.KeyConditionExpression = '#d BETWEEN :startDate AND :endDate';
    params.ExpressionAttributeNames = { '#d': 'date' };
    params.ExpressionAttributeValues = {
      ':startDate': { S: startDate || '' },
      ':endDate': { S: endDate || startDate || '' },
    };
  } else if (useMainTableWithFilters) {
    const filterParts: string[] = [];
    const values: Record<string, any> = {};

    if (territory) {
      filterParts.push('begins_with(pk, :territory)');
      values[':territory'] = { S: `${territory}#` };
    }
    if (startDate) {
      filterParts.push('pk >= :startPk');
      values[':startPk'] = { S: `c20#${startDate}` };
    }
    if (endDate) {
      filterParts.push('pk <= :endPk');
      values[':endPk'] = { S: `c20#${endDate}` };
    }

    params.FilterExpression = filterParts.join(' AND ');
    params.ExpressionAttributeValues = values;
  }

  if (startKey) {
    params.ExclusiveStartKey = startKey;
  }

  let result: ScanCommandOutput;
  try {
    const command = new ScanCommand(params);
    result = await client.send(command);
  } catch (error: any) {
    if (error.name === 'ValidationException' && error.message?.includes('index')) {
      params.IndexName = undefined;
      params.Limit = limit;
      if (startDate) {
        params.FilterExpression = (params.FilterExpression || '') + (params.FilterExpression ? ' AND ' : '') + 'pk >= :startPk';
        params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};
        params.ExpressionAttributeValues[':startPk'] = { S: `c20#${startDate}` };
      }
      if (endDate) {
        params.FilterExpression = (params.FilterExpression || '') + (params.FilterExpression ? ' AND ' : '') + 'pk <= :endPk';
        params.ExpressionAttributeValues[':endPk'] = { S: `c20#${endDate}` };
      }
      const command = new ScanCommand(params);
      result = await client.send(command);
    } else {
      throw error;
    }
  }

  if (result.Items && result.Items.length > 0) {
    result.Items.sort((a, b) => {
      const pkA = a.pk?.S || '';
      const pkB = b.pk?.S || '';
      return order === 'desc' ? pkB.localeCompare(pkA) : pkA.localeCompare(pkB);
    });

    const itemsToShow = order === 'desc' ? result.Items.slice(0, limit) : result.Items;

    console.log('\n--- Records ---\n');
    for (const item of itemsToShow) {
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

    const hasMore = !!result.LastEvaluatedKey;
    return { hasMore, lastKey: result.LastEvaluatedKey };
  }

  console.log('No records found.\n');
  return { hasMore: false };
}

async function main() {
  const argv = require('yargs')
    .option('limit', {
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
    .help()
    .alias('h', 'help')
    .parseSync() as Args;

  console.log('DynamoDB Endpoint:', process.env.DYNAMODB_ENDPOINT || 'AWS (production)');
  console.log('DynamoDB Table:', TABLE_NAME);
  console.log(`Limit per page: ${argv.limit}`);
  if (argv.territory) console.log(`Territory: ${argv.territory}`);
  if (argv['start-date']) console.log(`Start Date: ${argv['start-date']}`);
  if (argv['end-date']) console.log(`End Date: ${argv['end-date']}`);
  console.log(`Order: ${argv.order}`);
  console.log('\nPress Enter for next page, "q" to quit.\n');

  let lastKey: Record<string, any> | undefined = undefined;
  let shouldQuit = false;

  while (!shouldQuit) {
    const { hasMore, lastKey: newLastKey } = await query(
      argv.limit,
      lastKey,
      argv.territory,
      argv['start-date'],
      argv['end-date'],
      argv.order
    );
    lastKey = newLastKey;

    if (!hasMore) {
      console.log('--- End of results ---\n');
      break;
    }

    const answer = await new Promise<string>((resolve) => {
      rl.question('Next page? (Enter/q): ', resolve);
    });

    if (answer.toLowerCase() === 'q') {
      shouldQuit = true;
    }
  }

  rl.close();
  console.log('Query completed.');
}

main().catch((error) => {
  console.error('Query failed:', error);
  process.exit(1);
});