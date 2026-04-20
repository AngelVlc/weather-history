data "aws_s3_object" "lambda_api_zip" {
  bucket = aws_s3_bucket.lambda_code.id
  key    = "lambda-weather-api.zip"
}

resource "aws_iam_role" "lambda_api_role" {
  name = "${var.lambda_api_function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

data "aws_iam_policy_document" "lambda_api_permissions" {
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
      "dynamodb:Scan",
      "dynamodb:Query"
    ]

    resources = [
      aws_dynamodb_table.weather_data.arn,
      "${aws_dynamodb_table.weather_data.arn}/index/*"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "cloudfront:CreateInvalidation"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "lambda_api_policy" {
  name        = "${var.lambda_api_function_name}-policy"
  description = "Policy for Lambda API function to access DynamoDB, CloudWatch, and CloudFront"
  policy      = data.aws_iam_policy_document.lambda_api_permissions.json
}

resource "aws_iam_role_policy_attachment" "lambda_api_policy_attachment" {
  role       = aws_iam_role.lambda_api_role.name
  policy_arn = aws_iam_policy.lambda_api_policy.arn
}

resource "aws_lambda_function" "lambda_api" {
  function_name    = var.lambda_api_function_name
  role             = aws_iam_role.lambda_api_role.arn
  s3_bucket        = aws_s3_bucket.lambda_code.id
  s3_key           = "lambda-weather-api.zip"
  handler          = "dist/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = data.aws_s3_object.lambda_api_zip.etag

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.weather_data.name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_api_logs
  ]
}

resource "aws_cloudwatch_log_group" "lambda_api_logs" {
  name              = "/aws/lambda/${var.lambda_api_function_name}"
  retention_in_days = 3
}

resource "aws_lambda_function_url" "lambda_api" {
  function_name      = aws_lambda_function.lambda_api.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["GET"]
    allow_headers     = ["content-type"]
    max_age           = 7200
  }
}

resource "aws_lambda_permission" "api_url_public" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.lambda_api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "api_url_public_invoke" {
  statement_id             = "FunctionURLInvokeAllowPublicAccess"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.lambda_api.function_name
  principal                = "*"
  invoked_via_function_url = true
}

output "lambda_api_url" {
  value = aws_lambda_function_url.lambda_api.function_url
}