#!/bin/bash

set -e

echo "=== weather-history Local Development ==="

echo "1. Starting DynamoDB Local..."
docker compose up -d dynamodb-local

echo "2. Waiting for DynamoDB to be ready..."
sleep 2

echo "3. Creating table..."
DYNAMODB_ENDPOINT=http://localhost:8000 ./scripts/setup-dynamodb-local.sh

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To invoke Lambda locally with EventBridge event:"
echo "  DYNAMODB_ENDPOINT=http://localhost:8000 \\"
echo "  DYNAMODB_TABLE_NAME=weather-data \\"
echo "  sam local invoke WeatherExtractorFunction \\"
echo "    -e events/eventbridge.json"
echo ""
echo "Or use the npm script:"
echo "  DYNAMODB_ENDPOINT=http://localhost:8000 yarn invoke"
