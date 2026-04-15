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
  })
}

resource "aws_lambda_permission" "allow_eventbridge" {
  for_each = { for t in local.territories : t.id => t }

  statement_id  = "AllowExecutionFromEventBridge-${each.value.id}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weather_extractor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.each_territory[each.value.id].arn
}
