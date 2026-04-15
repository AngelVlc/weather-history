resource "aws_sqs_queue" "dlq" {
  name = "${var.lambda_function_name}-dlq"

  tags = {
    Name        = "weather-history-dlq"
    Environment = "production"
  }
}

resource "aws_sqs_queue_policy" "dlq_policy" {
  queue_url = aws_sqs_queue.dlq.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Id": "DLQPolicy",
  "Statement": [
    {
      "Sid": "AllowEventBridgeToSend",
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sqs:SendMessage",
      "Resource": "${aws_sqs_queue.dlq.arn}",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "arn:aws:events:${var.aws_region}:${local.account_id}:rule/weather-history-*"
        }
      }
    }
  ]
}
EOF
}

resource "aws_cloudwatch_event_rule" "each_territory" {
  for_each = { for t in local.territories : t.id => t }

  name                = "weather-history-${each.value.id}"
  description         = "Trigger Lambda for territory ${each.value.name}"
  schedule_expression = "cron(0 ${each.value.cronHour} * * ? *)"

  event_pattern = jsonencode({
    "source" : ["aws.events"]
  })
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  for_each = { for t in local.territories : t.id => t }

  rule      = aws_cloudwatch_event_rule.each_territory[each.value.id].name
  target_id = "WeatherExtractor"
  arn       = aws_lambda_function.weather_extractor.arn
  input = jsonencode({
    territory     = each.value.id
    territoryName = each.value.name
    location      = each.value.location
    stationIds    = each.value.stationIds
  })
  retry_policy {
    maximum_event_age_in_seconds = 1800
    maximum_retry_attempts       = 3
  }
  dead_letter_config {
    arn = aws_sqs_queue.dlq.arn
  }
}

resource "aws_lambda_permission" "allow_eventbridge" {
  for_each = { for t in local.territories : t.id => t }

  statement_id  = "AllowExecutionFromEventBridge-${each.value.id}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weather_extractor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.each_territory[each.value.id].arn
}