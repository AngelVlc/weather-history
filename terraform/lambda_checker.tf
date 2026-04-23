data "aws_iam_policy_document" "lambda_checker_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_checker_role" {
  name               = "${var.lambda_checker_function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_checker_assume_role.json
}

data "aws_iam_policy_document" "lambda_checker_permissions" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
    ]

    resources = [
      "${aws_dynamodb_table.weather_data.arn}",
      "${aws_dynamodb_table.weather_data.arn}/index/*"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "ses:SendEmail"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "lambda_checker_policy" {
  name        = "${var.lambda_checker_function_name}-policy"
  description = "Policy for Lambda checker function to access DynamoDB and SES"
  policy      = data.aws_iam_policy_document.lambda_checker_permissions.json
}

resource "aws_iam_role_policy_attachment" "lambda_checker_policy_attachment" {
  role       = aws_iam_role.lambda_checker_role.name
  policy_arn = aws_iam_policy.lambda_checker_policy.arn
}

data "aws_s3_object" "lambda_checker_zip" {
  bucket = aws_s3_bucket.lambda_code.id
  key    = "lambda-checker.zip"
}

resource "aws_lambda_function" "weather_checker" {
  function_name    = var.lambda_checker_function_name
  role             = aws_iam_role.lambda_checker_role.arn
  s3_bucket        = aws_s3_bucket.lambda_code.id
  s3_key           = "lambda-checker.zip"
  handler          = "dist/handler.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 128
  source_code_hash = data.aws_s3_object.lambda_checker_zip.etag

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.weather_data.name
      NOTIFICATION_EMAIL = var.notification_email
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_checker_logs
  ]
}

resource "aws_cloudwatch_log_group" "lambda_checker_logs" {
  name              = "/aws/lambda/${var.lambda_checker_function_name}"
  retention_in_days = 3
}