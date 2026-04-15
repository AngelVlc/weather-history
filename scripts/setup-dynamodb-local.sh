#!/bin/bash

set -e

ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
TABLE_NAME="${DYNAMODB_TABLE_NAME:-weather-data}"

echo "Creating DynamoDB table at $ENDPOINT..."

aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo "Table created successfully!"

aws dynamodb wait table-exists \
  --endpoint-url "$ENDPOINT" \
  --table-name "$TABLE_NAME"

echo "Table is ready."
