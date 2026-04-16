# weather-history

Daily weather data extraction and storage for historical analysis.

## Purpose

- Extract daily weather records (precipitation, min/max/avg temperature) for specific locations from a public website (AVAMET)
- Store data in a custom AWS DynamoDB database
- Manage all AWS infrastructure as code (Terraform) and CI/CD (CircleCI)
- Use TypeScript for the Lambda function with unit tests

## Tech Stack

- TypeScript
- AWS Lambda
- AWS DynamoDB
- AWS EventBridge
- Terraform
- CircleCI
- SAM CLI (local development)
- Docker (DynamoDB Local)

## Project Structure

```
weather-history/
├── packages/
│   ├── lambda-weather-extractor/    # Main Lambda function
│   │   ├── src/
│   │   ├── tests/
│   │   ├── events/
│   │   └── template.yaml
│   └── dlq-processor/              # DLQ notification Lambda
│       └── src/
├── terraform/                       # Infrastructure as code
├── config/
│   └── territories.yaml
├── scripts/
└── docker-compose.yml
```

## Prerequisites

- Node.js 20+
- Yarn
- Docker
- AWS CLI
- SAM CLI
- Terraform

## Setup

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test
```

## Local Development

### Start DynamoDB Local

```bash
yarn dev:up
```

### Create Table

```bash
yarn dev:setup
```

### Invoke Lambda Locally

```bash
cd packages/lambda-weather-extractor && \
  DYNAMODB_ENDPOINT=http://host.docker.internal:8000 \
  DYNAMODB_TABLE_NAME=weather-data \
  AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy \
  yarn invoke
```

### Verify Data

After invoking the Lambda, verify data was saved correctly:

```bash
DYNAMODB_ENDPOINT=http://localhost:8000 \
  DYNAMODB_TABLE_NAME=weather-data \
  AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy \
  yarn dev:verify
```

**Note:** `host.docker.internal` is used for invoke (Lambda runs in Docker), and `localhost` for verify (script runs on host).

### Stop DynamoDB Local

```bash
yarn dev:down
# or
yarn dev:stop
```

## Deployment

### Prerequisites

1. Create S3 bucket for Terraform state:
   ```bash
   aws s3 mb s3://weather-history-terraform-state
   ```

2. Configure CircleCI OIDC (see [CircleCI OIDC Setup](#circleci-oidc-setup))

### Deploy

The deployment is automated via CircleCI on push to `main`:

1. **test** - Runs unit tests
2. **deploy-terraform** - Creates/updates AWS infrastructure
3. **deploy-lambda** - Builds and uploads Lambda package to S3

### Manual Deployment

```bash
# Deploy Terraform
cd terraform
terraform init
terraform plan
terraform apply

# Deploy Lambda
cd packages/lambda-weather-extractor
yarn build
```

## Configuration

Territories are configured in `config/territories.yaml`:

```yaml
territories:
  - id: c20
    name: Ribera Alta
    location: Sumacarcer
    cronHour: 4
    timezone: Europe/Madrid
    stationIds:
      - c20m236e01
      - c20m236e02
      - c20m236e03
```

- `id`: Territory code (used for API request)
- `name`: Territory name
- `location`: Locality of interest
- `cronHour`: Hour to trigger Lambda (UTC)
- `stationIds`: List of station IDs to save (from avamet.org)

## Data Model

**DynamoDB Table: weather-data**

| Attribute | Type | Description |
|-----------|------|-------------|
| pk | String | `territory#date` (e.g., `c20#2026-04-14`) |
| sk | String | Station ID |
| territory | String | Territory code (e.g., `c20`) |
| territoryName | String | Territory name (e.g., `Ribera Alta`) |
| location | String | Location of interest (e.g., `Sumacarcer`) |
| date | String | Date (YYYY-MM-DD) |
| stationId | String | Station identifier |
| stationName | String | Station name |
| precipitation | Number | Precipitation in mm |
| tempMin | Number | Minimum temperature in °C |
| tempMax | Number | Maximum temperature in °C |
| tempAvg | Number | Average temperature in °C |

## Resilience

- **Retry Policy**: 3 retry attempts with up to 30 minutes backoff
- **Dead Letter Queue**: Failed events after retries are sent to SQS DLQ for manual reprocessing
- **DLQ Processor Lambda**: Automatically sends email notification when events reach DLQ
- **CloudWatch Logs**: 3-day retention for debugging

### What happens when an event fails?

1. Lambda receives event from EventBridge
2. Lambda fails (API down, parsing error, etc.)
3. EventBridge retries up to 3 times
4. After all retries fail, event goes to DLQ (SQS)
5. DLQ Processor Lambda detects new message
6. Email sent to configured notification address
7. Message stays in DLQ for investigation

### Investigating DLQ failures

1. Go to AWS Console → SQS → `weather-extractor-dlq`
2. View messages to see event details and error
3. Check CloudWatch Logs `/aws/lambda/weather-extractor` for error details
4. Fix the issue (e.g., AVAMET is back online)

### Redriving failed events

1. After fixing the issue, go to AWS Console → SQS → `weather-extractor-dlq`
2. Click "Start DLQ redrive" or "Redrive messages"
3. Select the messages to reprocess
4. Lambda will process them again

Note: The DLQ processor sends email notifications but does NOT delete messages, allowing for investigation and manual redrive.

## CircleCI OIDC Setup

CircleCI uses OIDC to authenticate with AWS instead of static credentials.

### 1. Create IAM Role

In AWS Console → IAM → Roles → Create role:

- **Trusted entity type**: Federated identity
- **Identity provider**: Select your CircleCI OIDC provider (e.g., `oidc.circleci.com/org/{ORG_ID}`)
- **Subject**: `org/{ORG_ID}/project/{PROJECT_ID}/*`
- **Permissions**: Attach the required policies (see below)

### 2. Required Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::weather-history-terraform-state",
                "arn:aws:s3:::weather-history-terraform-state/*",
                "arn:aws:s3:::weather-history-lambda",
                "arn:aws:s3:::weather-history-lambda/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:*"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:*:table/weather-data",
                "arn:aws:dynamodb:*:*:table/weather-data/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "lambda:*"
            ],
            "Resource": [
                "arn:aws:lambda:*:*:function:weather-extractor",
                "arn:aws:lambda:*:*:function:weather-extractor-dlq-processor",
                "arn:aws:lambda:*:*:event-source-mapping:*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:SendTemplatedEmail"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sqs:*"
            ],
            "Resource": [
                "arn:aws:sqs:*:*:weather-extractor-dlq"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:DeleteLogGroup",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:GetLogEvents",
                "logs:PutRetentionPolicy",
                "logs:FilterLogEvents",
                "logs:ListTagsForResource"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "events:PutRule",
                "events:DeleteRule",
                "events:DescribeRule",
                "events:PutTargets",
                "events:RemoveTargets",
                "events:EnableRule",
                "events:DisableRule",
                "events:ListRules",
                "events:ListTargetsByRule",
                "events:ListTagsForResource"
            ],
            "Resource": "arn:aws:events:*:*:rule/weather-history-*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sqs:CreateQueue",
                "sqs:DeleteQueue",
                "sqs:GetQueueUrl",
                "sqs:GetQueueAttributes",
                "sqs:SetQueueAttributes",
                "sqs:TagQueue",
                "sqs:ListQueues",
                "sqs:ListQueueTags",
                "sqs:PurgeQueue"
            ],
            "Resource": "arn:aws:sqs:*:*:weather-extractor-*"
        }
    ]
}
```

### 3. Configure CircleCI Environment Variables

In CircleCI → Project Settings → Environment Variables:

- Add `OIDC_ROLE_ARN` with the ARN of the role created above (e.g., `arn:aws:iam::123456789:role/CircleCI-WeatherHistory-Deploy`)
- Add `NOTIFICATION_EMAIL` with the email address for DLQ failure notifications (must be verified in AWS SES)
