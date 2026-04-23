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

output "scheduler_schedules" {
  description = "EventBridge Scheduler schedules created for each territory"
  value = {
    for schedule in aws_scheduler_schedule.each_territory :
    schedule.name => {
      schedule = schedule.schedule_expression
      timezone = schedule.schedule_expression_timezone
    }
  }
}