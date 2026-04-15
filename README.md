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
cd packages/lambda-weather-extractor && \
  DYNAMODB_ENDPOINT=http://localhost:8000 \
  DYNAMODB_TABLE_NAME=weather-data \
  AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy \
  yarn verify
```

**Note:** `host.docker.internal` is used for invoke (Lambda runs in Docker), and `localhost` for verify (script runs on host).

### Stop DynamoDB Local

```bash
yarn dev:down
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

3. Configure CircleCI environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

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
```

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
