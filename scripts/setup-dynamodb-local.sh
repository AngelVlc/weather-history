#!/bin/bash

set -e

ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
TABLE_NAME="${DYNAMODB_TABLE_NAME:-weather-data}"

echo "Creating DynamoDB table at $ENDPOINT..."

AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --region us-east-1 \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo "Table created successfully!"

AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy aws dynamodb wait table-exists \
  --endpoint-url "$ENDPOINT" \
  --region us-east-1 \
  --table-name "$TABLE_NAME"

echo "Table is ready."
