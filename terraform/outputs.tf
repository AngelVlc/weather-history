output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.weather_extractor.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.weather_extractor.arn
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.weather_data.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.weather_data.arn
}

output "eventbridge_rules" {
  description = "EventBridge rules created for each territory"
  value = {
    for rule in aws_cloudwatch_event_rule.each_territory :
    rule.name => {
      schedule = rule.schedule_expression
      target   = aws_cloudwatch_event_target.lambda_target[rule.name].target_id
    }
  }
}
