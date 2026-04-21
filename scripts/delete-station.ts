import * as readline from 'readline';
import { DynamoDBClient, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { createClient } from '@weather-history/shared-dynamodb-client';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

interface Args {
  'station-id': string;
  yes: boolean;
  help: boolean;
}

async function queryStationRecords(stationId: string): Promise<{ pk: string; sk: string }[]> {
  const client = createClient();
  const items: { pk: string; sk: string }[] = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const params: any = {
      TableName: TABLE_NAME,
      IndexName: 'stationId-date-index',
      KeyConditionExpression: 'stationId = :sid',
      ExpressionAttributeValues: {
        ':sid': { S: stationId },
      },
      Limit: 1000,
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const command = new QueryCommand(params);
    const result = await client.send(command);

    if (result.Items) {
      for (const item of result.Items) {
        items.push({
          pk: item.pk?.S || '',
          sk: item.sk?.S || '',
        });
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function deleteRecords(
  records: { pk: string; sk: string }[],
  yes: boolean
): Promise<number> {
  if (records.length === 0) {
    console.log('No records to delete.');
    return 0;
  }

  if (!yes) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `Are you sure you want to delete ${records.length} records? (yes/no): `,
        resolve
      );
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      return 0;
    }
  }

  const client = createClient();
  let deleted = 0;

  for (let i = 0; i < records.length; i += 25) {
    const batch = records.slice(i, i + 25);

    for (const record of batch) {
      const command = new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: { S: record.pk },
          sk: { S: record.sk },
        },
      });

      try {
        await client.send(command);
        deleted++;
        console.log(`Deleted: ${record.pk} / ${record.sk}`);
      } catch (error) {
        console.error(`Failed to delete ${record.pk} / ${record.sk}:`, error);
      }
    }

    console.log(`Progress: ${deleted}/${records.length}`);
  }

  return deleted;
}

async function main() {
  const argv = require('yargs')
    .option('station-id', {
      describe: 'Station ID to delete records for',
      type: 'string',
      demandOption: true,
    })
    .option('yes', {
      describe: 'Skip confirmation',
      type: 'boolean',
      default: false,
    })
    .help()
    .alias('h', 'help')
    .parseSync() as Args;

  console.log('DynamoDB Endpoint:', process.env.DYNAMODB_ENDPOINT || 'AWS (production)');
  console.log('DynamoDB Table:', TABLE_NAME);
  console.log('Station ID:', argv['station-id']);
  console.log('');

  console.log('Fetching records...');
  const records = await queryStationRecords(argv['station-id']);

  if (records.length === 0) {
    console.log(`No records found for station ${argv['station-id']}`);
    return;
  }

  console.log(`Found ${records.length} records`);
  console.log('');

  const deleted = await deleteRecords(records, argv.yes);

  console.log('');
  console.log(`Deleted ${deleted} records`);
}

main().catch((error) => {
  console.error('Delete failed:', error.message || error);
  process.exit(1);
});