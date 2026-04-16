data "archive_file" "dlq_processor_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../packages/dlq-processor/src"
  output_path = "${path.module}/../packages/dlq-processor/dist.zip"
}

resource "aws_lambda_function" "dlq_processor" {
  filename         = data.archive_file.dlq_processor_lambda.output_path
  function_name    = "${var.lambda_function_name}-dlq-processor"
  role             = aws_iam_role.dlq_processor_role.arn
  handler          = "dist/handler.handler"
  source_code_hash = data.archive_file.dlq_processor_lambda.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      NOTIFICATION_EMAIL = var.notification_email
    }
  }

  depends_on = [
    aws_iam_role_policy.dlq_processor_ses_policy
  ]
}

resource "aws_iam_role" "dlq_processor_role" {
  name = "${var.lambda_function_name}-dlq-processor-role"

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

resource "aws_iam_role_policy" "dlq_processor_ses_policy" {
  name = "${var.lambda_function_name}-dlq-processor-ses-policy"
  role = aws_iam_role.dlq_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.dlq.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_event_source_mapping" "dlq_processor_trigger" {
  event_source_arn = aws_sqs_queue.dlq.arn
  function_name    = aws_lambda_function.dlq_processor.arn
  batch_size       = 1
  enabled          = true
}
