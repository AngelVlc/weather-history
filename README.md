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
│   └── lambda-weather-extractor/    # Lambda function
│       ├── src/
│       │   ├── handler.ts           # Lambda entry point
│       │   ├── httpClient.ts       # HTTP client for AVAMET
│       │   ├── parser/             # HTML parsing logic
│       │   └── dynamodb/           # DynamoDB client
│       ├── tests/                   # Jest unit tests
│       ├── events/                  # Sample event files
│       └── template.yaml           # SAM template
├── terraform/                       # Infrastructure as code
├── config/
│   └── territories.yaml            # Territory configuration
├── scripts/                         # Helper scripts
└── docker-compose.yml              # DynamoDB Local
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

1. Create S3 bucket for Lambda deployment:
   ```bash
   aws s3 mb s3://weather-history-lambda
   ```

2. Create S3 bucket for Terraform state:
   ```bash
   aws s3 mb s3://weather-history-terraform-state
   ```

3. Configure CircleCI OIDC (see [CircleCI OIDC Setup](#circleci-oidc-setup))

### Deploy

The deployment is automated via CircleCI on push to `main`:

1. **test** - Runs unit tests
2. **deploy-lambda** - Builds and uploads Lambda package to S3
3. **deploy-terraform** - Applies Terraform configuration

### Manual Deployment

```bash
# Deploy Lambda
cd packages/lambda-weather-extractor
yarn build
sam deploy

# Deploy Terraform
cd terraform
terraform init
terraform plan
terraform apply
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
- **CloudWatch Logs**: 3-day retention for debugging

If the source website (AVAMET) is down, the event will be retried automatically. If all retries fail, check the DLQ in AWS Console to redrive failed events once the source is available again.

## CircleCI OIDC Setup

CircleCI uses OIDC to authenticate with AWS instead of static credentials.

### 1. Create IAM Role

In AWS Console → IAM → Roles → Create role:

- **Trusted entity type**: Federated identity
- **Identity provider**: Select your CircleCI OIDC provider (e.g., `oidc.circleci.com/org/{ORG_ID}`)
- **Subject**: `org/{ORG_ID}/project/{PROJECT_ID}/*`
- **Permissions**: Attach the required policies (see below)

### 2. Required Policies

**For deploy-lambda:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::weather-history-lambda",
        "arn:aws:s3:::weather-history-lambda/*"
      ]
    }
  ]
}
```

**For deploy-terraform:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::weather-history-terraform-state",
        "arn:aws:s3:::weather-history-terraform-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable", "dynamodb:DeleteTable", "dynamodb:DescribeTable",
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:ListTables"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/weather-history-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:*Role", "iam:*Policy", "iam:AttachRolePolicy", "iam:DetachRolePolicy",
        "lambda:*", "logs:*", "events:*", "sqs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Configure CircleCI Environment Variable

In CircleCI → Project Settings → Environment Variables:

- Add `OIDC_ROLE_ARN` with the ARN of the role created above (e.g., `arn:aws:iam::123456789:role/CircleCI-WeatherHistory-Deploy`)
