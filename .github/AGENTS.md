# Project Conventions

## Language
- All code, comments, and documentation in English
- User communication can be in Spanish

## Project
- Name: weather-history
- Purpose: Daily weather data extraction (precipitation + temperatures) from public web to AWS database
- Data stored: precipitation (mm), min temp, max temp, avg temp
- Stack: TypeScript, AWS Lambda, Terraform, CircleCI, SAM CLI
- Tests: Unit tests for parser

## Architecture
- Source: AVAMET (https://www.avamet.org)
- Lambda triggered by EventBridge (one rule per territory)
- EventBridge passes: `{ territory, territoryName, location, stationIds }`
- Lambda calculates: `date = yesterday` (local time)
- Storage: AWS DynamoDB
- Deployment: SAM CLI + Terraform
- Testing: SAM CLI (local invoke), Jest (unit tests)

## Local Development Workflow
When running local tests or development:
1. Show each command being executed step by step
2. Explain what each step does
3. Show the output of each command
4. Wait for user confirmation before proceeding (or let user decide)

Example format:
```
## Step X: [Description]
$ [command]
[output]
```

## Testing Local Commands
```bash
yarn dev:up        # Start DynamoDB Local
yarn dev:setup     # Create DynamoDB table
yarn invoke:local  # Invoke Lambda with SAM CLI
yarn dev:verify    # Verify data with yarn dev:verify
yarn dev:down      # Stop DynamoDB Local
```

## Monorepo Structure
```
weather-history/
├── packages/
│   └── lambda-weather-extractor/
├── terraform/
├── config/
│   └── territories.yaml
└── .circleci/
```

## Conventions
- Comments in code: none unless explicitly requested
- Commit messages: concise, focus on the "why"
- Feature branches: short-lived, merged via PR
