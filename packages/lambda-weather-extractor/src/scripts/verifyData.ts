import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const clientConfig: { endpoint?: string; region?: string } = {
  region: process.env.AWS_REGION || 'us-east-1',
};

if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

const client = new DynamoDBClient(clientConfig);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'weather-data';

async function main() {
  console.log(`Scanning table: ${TABLE_NAME}`);
  if (process.env.DYNAMODB_ENDPOINT) {
    console.log(`Endpoint: ${process.env.DYNAMODB_ENDPOINT}`);
  }

  const command = new ScanCommand({
    TableName: TABLE_NAME,
    ProjectionExpression: 'pk,sk,stationName,tempMin,tempMax,tempAvg,precipitation',
  });

  const response = await client.send(command);

  console.log(`\nFound ${response.Items?.length || 0} records:\n`);

  response.Items?.forEach((item) => {
    console.log(`  ${item.stationName?.S}: ${item.tempMin?.N}°C - ${item.tempMax?.N}°C (avg: ${item.tempAvg?.N}°C) | Rain: ${item.precipitation?.N}mm`);
  });

  console.log(`\nPartition key example: ${response.Items?.[0]?.pk?.S}`);
}

main().catch(console.error);
