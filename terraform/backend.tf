terraform {
  backend "s3" {
    bucket = "weather-history-terraform-state"
    key    = "weather-history/terraform.tfstate"
    region = "us-east-1"
  }
}
