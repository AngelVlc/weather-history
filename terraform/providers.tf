terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.40, < 7.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

data "local_file" "territories_config" {
  filename = "${path.module}/../config/territories.yaml"
}

locals {
  territories = yamldecode(data.local_file.territories_config.content).territories
  account_id  = data.aws_caller_identity.current.account_id
  region      = var.aws_region
}
