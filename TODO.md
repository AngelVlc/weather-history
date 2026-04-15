# weather-history - TODO

## Phase 1: Project Setup
- [ ] Crear estructura monorepo
- [ ] yarn workspaces + TypeScript + Jest
- [ ] samconfig.toml para SAM CLI

## Phase 2: Configuration
- [ ] `config/territories.yaml` (c20 - Sumacarcer)
- [ ] Tipos TypeScript compartidos

## Phase 3: Lambda (`packages/lambda-weather-extractor`)
- [ ] HTTP client (axios)
- [ ] HTML parser (cheerio)
- [ ] Extracción de datos por estación
- [ ] Cliente DynamoDB (@aws-sdk/client-dynamodb)
- [ ] Handler: recibe `{ territory, territoryName }` → calcula yesterday → GET → parse → save
- [ ] Unit tests (Jest)
- [ ] Template SAM (`template.yaml`)

## Phase 4: Terraform (`terraform/`)
- [ ] DynamoDB table (PK: `pk`, SK: `sk`)
- [ ] Lambda function + IAM role
- [ ] EventBridge rules (loop desde `config/territories.yaml`)
- [ ] Input Transformer para pasar `{ territory, territoryName }`

## Phase 5: CircleCI (`.circleci/`)
- [ ] Jobs: test → build → deploy-lambda (sam deploy) → deploy-tf

## Testing Local
- [ ] `sam local invoke` con mock events de EventBridge
