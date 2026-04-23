resource "aws_iam_role" "scheduler_role" {
  name = "${var.lambda_function_name}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "scheduler.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_policy" {
  name = "${var.lambda_function_name}-scheduler-policy"
  role = aws_iam_role.scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction",
          "lambda:InvokeFunctionAsync"
        ]
        Resource = aws_lambda_function.weather_extractor.arn
      },
      {
        Effect = "Allow"
        Action = [
          "scheduler:CreateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:DescribeSchedule",
          "scheduler:GetSchedule",
          "scheduler:UpdateSchedule"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_scheduler_schedule" "each_territory" {
  for_each = { for t in local.territories : t.id => t }

  name                = "weather-history-${each.value.id}"
  description         = "Trigger Lambda for territory ${each.value.name}"
  schedule_expression = "cron(0 ${each.value.cronHour} * * ? *)"
  schedule_expression_timezone = "Europe/Madrid"

  target {
    arn      = aws_lambda_function.weather_extractor.arn
    role_arn = aws_iam_role.scheduler_role.arn
    input   = jsonencode({
      territory     = each.value.id
      territoryName = each.value.name
      location     = each.value.location
      stationIds   = each.value.stationIds
    })
  }

  flexible_time_window {
    mode = "OFF"
  }
}