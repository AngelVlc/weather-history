resource "aws_s3_bucket" "lambda_code" {
  bucket = "weather-history-lambda"

  tags = {
    Name        = "weather-history-lambda"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "lambda_code" {
  bucket = aws_s3_bucket.lambda_code.id

  versioning_configuration {
    status = "Disabled"
  }
}
