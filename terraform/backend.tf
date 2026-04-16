terraform {
  backend "s3" {
    bucket = "weather-history-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
