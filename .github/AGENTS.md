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
- EventBridge passes: `{ territory, territoryName }`
- Lambda calculates: `date = yesterday` (local time)
- Storage: AWS DynamoDB
- Deployment: SAM CLI + Terraform
- Testing: SAM CLI (local invoke), Jest (unit tests)

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
