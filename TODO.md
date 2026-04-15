# weather-history - TODO

## Phase 1: Project Setup
- [x] Crear estructura monorepo
- [x] yarn workspaces + TypeScript + Jest
- [x] samconfig.toml para SAM CLI

## Phase 2: Configuration
- [x] `config/territories.yaml` (c20 - Ribera Alta - Sumacarcer)
- [x] Tipos TypeScript compartidos

## Phase 3: Lambda (`packages/lambda-weather-extractor`)
- [x] HTTP client (axios)
- [x] HTML parser (cheerio)
- [x] Extracción de datos por estación
- [x] Cliente DynamoDB (@aws-sdk/client-dynamodb)
- [x] Handler: recibe `{ territory, territoryName, location, stationIds }` → filtra → calcula yesterday → GET → parse → save
- [x] Unit tests (Jest) - 5 passing
- [x] Template SAM (`template.yaml`)

## Phase 4: Terraform (`terraform/`)
- [x] DynamoDB table (PK: `pk`, SK: `sk`)
- [x] Lambda function + IAM role
- [x] EventBridge rules (loop desde `config/territories.yaml`)
- [ ] Input Transformer para pasar `{ territory, territoryName }`

## Phase 5: CircleCI (`.circleci/`)
- [x] Pipeline jobs: test → build → deploy-lambda (sam deploy) → deploy-tf

## Testing Local
- [x] docker-compose.yml con DynamoDB Local
- [x] Scripts para setup local
- [x] SAM CLI config para local invoke
- [x] Sample event files

## Setup Local Commands

```bash
# Start DynamoDB Local
yarn dev:up

# Setup table (in another terminal)
yarn dev:setup

# Invoke Lambda locally
DYNAMODB_ENDPOINT=http://localhost:8000 \
  DYNAMODB_TABLE_NAME=weather-data \
  yarn invoke:local

# Stop DynamoDB Local
yarn dev:down
```

## Pending
- Configurar credenciales AWS en CircleCI
- Crear buckets S3 para Lambda y estado Terraform
- Primera deploy a AWS
