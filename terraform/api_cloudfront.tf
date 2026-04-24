# CloudFront distribution for API with query string caching
data "aws_lambda_function_url" "lambda_api" {
  function_name = var.lambda_api_function_name
}

resource "aws_cloudfront_cache_policy" "api" {
  name    = "weather-api-cache-policy"
  comment = "Cache policy for weather API that includes days and until query strings"

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["days", "until"]
      }
    }
  }
}

resource "aws_cloudfront_distribution" "api" {
  origin {
    domain_name = trimsuffix(replace(data.aws_lambda_function_url.lambda_api.function_url, "https://", ""), "/")
    origin_id   = "lambda-api-origin"

    custom_origin_config {
      http_port              = 443
      https_port             = 443
      origin_protocol_policy = "match-viewer"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true

  default_cache_behavior {
    allowed_methods           = ["GET", "HEAD"]
    cached_methods            = ["GET", "HEAD"]
    target_origin_id          = "lambda-api-origin"
    viewer_protocol_policy   = "redirect-to-https"
    compress                = true
    cache_policy_id         = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  price_class = "PriceClass_All"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    ssl_support_method           = "sni-only"
  }

  tags = {
    Name        = "weather-history-api"
    Description = "weather-history-api"
  }
}

output "api_cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.api.domain_name}"
}

output "lambda_api_url" {
  value = aws_lambda_function_url.lambda_api.function_url
}