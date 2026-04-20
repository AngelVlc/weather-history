# CloudFront distribution for frontend (without custom domain)
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = "${aws_s3_bucket.frontend.id}.s3-website.${var.aws_region}.amazonaws.com"
    origin_id   = "S3-frontend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-frontend"
    viewer_protocol_policy = "allow-all"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "weather-history-frontend"
    Description = "weather-history-frontend"
  }
}

output "frontend_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "frontend_distribution_arn" {
  value = aws_cloudfront_distribution.frontend.arn
}

# Output the CloudFront distribution domain name
output "frontend_distribution_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}