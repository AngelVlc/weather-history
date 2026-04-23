# weather-history

Daily weather data extraction and storage for historical analysis.

## Table of Contents

- [Purpose](#purpose)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Development](#development)
  - [Install Dependencies](#install-dependencies)
  - [DynamoDB Local](#dynamodb-local)
  - [Create Table](#create-table)
  - [Lambda Extractor](#lambda-extractor)
  - [Lambda Checker](#lambda-checker)
  - [Lambda Weather API](#lambda-weather-api)
  - [Weather UI](#weather-ui)
- [Populate Database](#populate-database)
  - [Usage](#usage)
  - [Options](#options)
- [Query Data](#query-data)
  - [Usage](#usage-1)
  - [Options](#options-1)
- [Delete Station Records](#delete-station-records)
  - [Usage](#usage-2)
  - [Options](#options-2)
- [Deployment](#deployment)
  - [Prerequisites](#prerequisites-1)
  - [Deploy](#deploy)
- [Database](#database)
  - [Data Model](#data-model)
  - [Global Secondary Indexes](#global-secondary-indexes)
- [API Reference](#api-reference)
  - [Endpoints](#endpoints)
  - [Response Formats](#response-formats)
  - [Caching](#caching)
- [Resilience](#resilience)
  - [What happens when an event fails?](#what-happens-when-an-event-fails)
- [CircleCI OIDC Setup](#circleci-oidc-setup)
  - [1. Create IAM Role](#1-create-iam-role)
  - [2. Required Policy](#2-required-policy)
  - [3. Configure CircleCI Environment Variables](#3-configure-circleci-environment-variables)

## Purpose

- Extract daily weather records (precipitation, min/max/avg temperature) for specific locations from a public website (AVAMET)
- Store data in a custom AWS DynamoDB database
- Manage all AWS infrastructure as code (Terraform) and CI/CD (CircleCI)
- Use TypeScript for the Lambda function with unit tests

## Tech Stack

- TypeScript
- AWS Lambda
- AWS DynamoDB
- AWS EventBridge Scheduler
- AWS CloudFront
- Terraform
- CircleCI
- SAM CLI (local development)
- Docker (DynamoDB Local)
- React + Vite
- Tailwind CSS
- Chart.js

## Project Structure

```
weather-history/
├── packages/
│   ├── shared-dynamodb-client/       # Shared DynamoDB client
│   │   └── src/
│   ├── lambda-weather-extractor/     # Main Lambda function (data extraction)
│   │   ├── src/
│   │   ├── tests/
│   │   ├── events/
│   │   └── template.yaml
│   │   └── # (removed)
│   ├── lambda-weather-api/           # API Lambda (serves data to UI)
│   │   ├── src/
│   │   ├── tests/
│   │   └── template.yaml
│   ├── lambda-weather-checker/       # Checker Lambda (data completeness + notifications)
│   │   ├── src/
│   │   └── tests/
│   └── weather-ui/                   # Frontend (React + Vite)
│       ├── src/
��       │   ├── pages/
│       │   ├── components/
│       │   └── api/
│       └── public/
├── terraform/                        # Infrastructure as code
├── config/
│   └── territories.yaml
├── scripts/
├── docker-compose.yml
└── .circleci/
    └── config.yml
```

## Prerequisites

- Node.js 20+
- Yarn
- Docker
- AWS CLI
- SAM CLI
- Terraform

## Configuration

### Environment Variables

The project uses a shared DynamoDB client. Depending on where you're running:

| Mode | Environment Variables |
|------|---------------------|
| **Local → DynamoDB Local** | `DYNAMODB_ENDPOINT=http://localhost:8000`, `AWS_ACCESS_KEY_ID=xxx`, `AWS_SECRET_ACCESS_KEY=xxx` |
| **Local → AWS DynamoDB** | `AWS_PROFILE=xxx` (uses credentials from `~/.aws/credentials`) |
| **AWS Lambda** | None (uses IAM role automatically) |

### Shared Packages

- `@weather-history/shared-dynamodb-client` - Shared DynamoDB client used by all Lambdas and scripts

## Development

### Install Dependencies

```bash
yarn install
```

This creates the workspace symlinks for shared packages like `@weather-history/shared-dynamodb-client`.

### DynamoDB Local

```bash
# Start
yarn dev:up

# Stop
yarn dev:down
# or
yarn dev:stop
```

### Create Table

```bash
yarn dev:setup
```

### Lambda Extractor

```bash
cd packages/lambda-weather-extractor
DYNAMODB_ENDPOINT=http://host.docker.internal:8000 \
DYNAMODB_TABLE_NAME=weather-data \
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy \
yarn invoke
```

SAM CLI automatically passes the event defined in `events/lambda-input.json`.

### Lambda Checker

```bash
cd packages/lambda-weather-checker
DYNAMODB_ENDPOINT=http://host.docker.internal:8000 \
DYNAMODB_TABLE_NAME=weather-data \
NOTIFICATION_EMAIL=test@example.com \
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy \
yarn invoke
```

SAM CLI automatically passes the event defined in `events/checker.json`. The event contains:

```json
{
  "stationIds": ["c20m236e01", "c20m236e02", "c15m250e34", "c21m235e02"]
}
```

### Lambda Weather API

```bash
cd packages/lambda-weather-api
yarn start
```

### Weather UI

```bash
cd packages/weather-ui && yarn dev
```

## Populate Database

Use the populate script to insert historical data into DynamoDB.

### Usage

```bash
# Single day (local)
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=fake AWS_SECRET_ACCESS_KEY=fake \
DYNAMODB_TABLE_NAME=weather-data \
yarn populate --start-date 2026-04-16

# Date range (local)
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=fake AWS_SECRET_ACCESS_KEY=fake \
DYNAMODB_TABLE_NAME=weather-data \
yarn populate --start-date 2026-04-01 --end-date 2026-04-15

# Production (AWS with profile)
AWS_PROFILE=xxxx AWS_REGION=us-east-1 \
DYNAMODB_TABLE_NAME=weather-data \
yarn populate --start-date 2026-04-01 --end-date 2026-04-15
```

### Options

| Option | Description | Required |
|--------|-------------|----------|
| `--start-date` | Start date (YYYY-MM-DD) | Yes |
| `--end-date` | End date (YYYY-MM-DD), defaults to start-date | No |
| `--sleep` | Seconds to wait between requests | No (default: 0) |
| `--stations` | Comma-separated list of station IDs to process | No |
| `AWS_PROFILE` | AWS profile for production | No |
| `AWS_REGION` | AWS region (required for production) | No |
| `DYNAMODB_ENDPOINT` | DynamoDB endpoint (local only) | No |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name | No (default: weather-data) |

## Query Data

Use the query script to view stored data with pagination.

### Usage

```bash
# Local (requires AWS credentials for local DynamoDB)
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=fake AWS_SECRET_ACCESS_KEY=fake \
DYNAMODB_TABLE_NAME=weather-data \
yarn query

# Production (with AWS profile)
AWS_PROFILE=personal \
DYNAMODB_TABLE_NAME=weather-data \
yarn query

# Custom page size
DYNAMODB_TABLE_NAME=weather-data yarn query --page-size 5

# Filter by stations and date range
AWS_PROFILE=personal \
DYNAMODB_TABLE_NAME=weather-data yarn query \
  --stations c20m236e01,c20m236e02 \
  --start-date 2026-04-01 \
  --end-date 2026-04-15

# Ascending order (oldest first)
AWS_PROFILE=personal \
DYNAMODB_TABLE_NAME=weather-data yarn query --order asc

# Raw DynamoDB output (for debugging)
AWS_PROFILE=personal \
DYNAMODB_TABLE_NAME=weather-data yarn query --raw
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--page-size` | Number of records per page | 10 |
| `--stations` | Comma-separated list of station IDs | all |
| `--start-date` | Filter by start date (YYYY-MM-DD) | - |
| `--end-date` | Filter by end date (YYYY-MM-DD) | - |
| `--order` | Sort order (`asc` or `desc`) | desc |
| `--raw` | Show raw DynamoDB items | false |

**Controls:**
- Press Enter to see next page
- Press "q" to quit

## Delete Station Records

Use the delete-station script to delete all records for a specific station ID.

### Usage

```bash
# Local (requires AWS credentials for local DynamoDB)
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=fake AWS_SECRET_ACCESS_KEY=fake \
DYNAMODB_TABLE_NAME=weather-data \
yarn delete-station --station-id c20m236e01

# Production (AWS with profile)
AWS_PROFILE=xxxx \
DYNAMODB_TABLE_NAME=weather-data \
yarn delete-station --station-id c20m236e01
```

### Options

| Option | Description | Required |
|--------|-------------|----------|
| `--station-id` | Station ID to delete records for | Yes |
| `--yes` | Skip confirmation prompt | No (default: false) |

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
2. **upload-lambdas** - Builds and uploads Lambda code to S3
3. **deploy-terraform-infra** - Creates infrastructure (S3, DynamoDB, IAM, EventBridge Scheduler)
4. **deploy-lambda-extractor** - Creates Lambda function and trigger
5. **build-frontend** - Builds React frontend
6. **deploy-frontend** - Deploys frontend to S3 and invalidates CloudFront

## Database

### Data Model

**DynamoDB Table: weather-data**

Each territory event creates one record per station (multiple records share the same pk):

| Attribute | Type | Description |
|-----------|------|-------------|
| pk | String | `territory#date` (e.g., `c20#2026-04-15`) |
| sk | String | Station ID (e.g., `c20m236e01`) |
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

### Global Secondary Indexes

The table has one GSI for efficient date-based queries:

| Index Name | Hash Key | Range Key | Purpose |
|------------|----------|-----------|---------|
| date-index | date | pk | Query by date range |

Note: This GSI is currently used for backend queries. A future GSI (`station-date-index`) may be added to support queries by station ID with date range (e.g., 1 year of data for a specific station).

## API Reference

The weather API is a Lambda function that serves weather data to the frontend. It's accessible via a Lambda Function URL.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stations` | Returns list of all available stations |
| GET | `/stations/{stationId}?days=7` | Returns weather data for a specific station (last N days) |

### Response Formats

**GET /stations**
```json
{
  "stations": [
    { "id": "c20m236e01", "name": "Sumacàrcer", "territory": "Ribera Alta" },
    { "id": "c20m236e02", "name": "Sumacàrcer (Alt de la Ceja)", "territory": "Ribera Alta" }
  ]
}
```

**GET /stations/{stationId}?days=7**
```json
{
  "stationId": "c20m236e01",
  "stationName": "Sumacàrcer",
  "territory": "c20",
  "territoryName": "Ribera Alta",
  "data": [
    { "date": "2026-04-16", "tempMax": 27.2, "tempMin": 12.2, "tempAvg": 19.4, "precipitation": 0 },
    { "date": "2026-04-15", "tempMax": 29.2, "tempMin": 11.2, "tempAvg": 19.1, "precipitation": 0 }
  ]
}
```

### Caching

Both endpoints include `Cache-Control` headers:
- `/stations`: `public, max-age=21600` (6 hours)
- `/stations/{stationId}`: `public, max-age=7200` (2 hours)

## Resilience

### What happens when an event fails?

1. Lambda receives event from EventBridge
2. Lambda fails (API down, parsing error, etc.)
3. EventBridge retries up to 3 times
4. After all retries fail, the event is lost (no DLQ configured)
5. Check CloudWatch Logs `/aws/lambda/weather-extractor` for error details

## Notifications

The weather-checker Lambda monitors data completeness and sends email notifications when stations are missing data.

### How it works

1. EventBridge triggers the checker at 9:00 AM (Europe/Madrid timezone)
2. The checker queries DynamoDB for all stations defined in `config/territories.yaml` for the previous day
3. If all stations have data → no action taken
4. If any station is missing → sends email notification with list of missing stations

### Email Configuration

The notification email address is configured via CircleCI environment variable:
- `NOTIFICATION_EMAIL` - Destination email address for missing data alerts

### IAM Permissions

The checker Lambda requires:
- `dynamodb:GetItem` - To query station records
- `ses:SendEmail` - To send notifications (uses SES default identity)

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
                "arn:aws:s3:::weather-history-lambda/*",
                "arn:aws:s3:::weather-history-frontend",
                "arn:aws:s3:::weather-history-frontend/*"
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
                "arn:aws:lambda:*:*:function:weather-api",
                "arn:aws:lambda:*:*:function:weather-checker"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateDistribution",
                "cloudfront:CreateDistributionWithTags",
                "cloudfront:CreateInvalidation",
                "cloudfront:GetDistribution",
                "cloudfront:ListDistributions",
                "cloudfront:TagResource",
                "cloudfront:ListTagsForResource",
                "cloudfront:UpdateDistribution",
                "cloudfront:DeleteDistribution"
            ],
            "Resource": "*"
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
                "scheduler:CreateSchedule",
                "scheduler:DeleteSchedule",
                "scheduler:DescribeSchedule",
                "scheduler:ListSchedules",
                "scheduler:GetSchedule",
                "scheduler:UpdateSchedule"
            ],
            "Resource": "arn:aws:scheduler:*:*:schedule/*"
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
        },
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. Configure CircleCI Environment Variables

In CircleCI → Project Settings → Environment Variables:

- Add `OIDC_ROLE_ARN` with the ARN of the role created above (e.g., `arn:aws:iam::123456789:role/CircleCI-WeatherHistory-Deploy`)
- Add `CUSTOM_DOMAIN` with your custom domain for the frontend (e.g., `weather.example.com`)
- Add `ACM_CERTIFICATE_ARN` with the ARN of your ACM certificate in us-east-1 (e.g., `arn:aws:acm:us-east-1:123456789:certificate/abc123...`)

**Note**: The ACM certificate must be in `us-east-1` and cover your custom domain (use a wildcard like `*.example.com` for subdomains).
