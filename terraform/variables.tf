variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "weather-extractor"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "weather-data"
}

variable "notification_email" {
  description = "Email address for DLQ failure notifications"
  type        = string
  default     = ""
}
