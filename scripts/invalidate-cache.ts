import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

interface Args {
  distributionId: string;
  path?: string;
  help: boolean;
}

async function invalidateCache(distributionId: string, path: string = '/*'): Promise<void> {
  const client = new CloudFrontClient({ region: process.env.AWS_REGION || 'us-east-1' });

  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `weather-history-${Date.now()}`,
      Paths: {
        Quantity: 1,
        Items: [path],
      },
    },
  });

  const result = await client.send(command);
  console.log(`Invalidation created: ${result.Invalidation?.Id}`);
  console.log(`Status: ${result.Invalidation?.Status}`);
}

const argv = require('yargs')
  .option('distribution-id', {
    describe: 'CloudFront distribution ID',
    type: 'string',
    demandOption: true,
  })
  .option('path', {
    describe: 'Path to invalidate',
    type: 'string',
    default: '/*',
  })
  .help()
  .alias('h', 'help')
  .parseSync() as Args;

console.log(`Invalidating CloudFront distribution: ${argv.distributionId}`);
console.log(`Path: ${argv.path}`);

invalidateCache(argv.distributionId, argv.path)
  .then(() => {
    console.log('Cache invalidation completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Invalidation failed:', error.message || error);
    process.exit(1);
  });