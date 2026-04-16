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

Example directory structure for the monorepo:

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

## CircleCI OIDC Authentication

This project uses CircleCI OIDC for AWS authentication instead of static credentials.

### When working with CircleCI config.yml

- Use `aws-cli/setup` with `role_arn: ${OIDC_ROLE_ARN}` instead of static keys
- Example:
  ```yaml
  - aws-cli/setup:
      role_arn: ${OIDC_ROLE_ARN}
      region: us-east-1
      role_session_name: "circleci-deploy"
  ```

### When adding new AWS permissions

1. Check what resources the job needs to access
2. Document the required IAM permissions
3. Update the OIDC role trust policy to allow the specific project: `org/{ORG_ID}/project/{PROJECT_ID}/*`
4. **Always update the IAM policy in README.md** - this is the source of truth for AWS permissions

### CircleCI Orbs

Before manually installing tools in CircleCI jobs, check if an orb exists that already provides that functionality. Orbs include pre-installed and pre-configured tools, reducing build time and maintenance.

Examples:
- `circleci/terraform@1.0.2` - includes Terraform CLI
- `circleci/aws-cli@4.1.3` - includes AWS CLI
- `circleci/node@5.2.0` - includes Node.js with package manager helpers

### Important reminders for new projects

1. **Identity Provider**: Reuse existing CircleCI OIDC provider (don't create new ones)
2. **New Role**: Create a new IAM role for each project with project-specific trust policy
3. **Environment Variable**: Add `OIDC_ROLE_ARN` in CircleCI project settings
4. **No Static Credentials**: Never add `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`
5. **Terraform State Bucket**: Create S3 bucket for Terraform state before first deployment (e.g., `aws s3 mb s3://my-project-terraform-state`)
