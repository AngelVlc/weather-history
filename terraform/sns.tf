resource "aws_sns_topic" "dlq_notifications" {
  name = "${var.lambda_function_name}-dlq-notifications"

  tags = {
    Name        = "weather-history-dlq-notifications"
    Environment = "production"
  }
}
