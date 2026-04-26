#!/bin/bash
# deploy_lambda.sh
# Builds and packages the Lambda function for deployment.
#
# Prerequisites:
#   - Go 1.23+ installed
#   - AWS CLI configured with appropriate permissions
#   - Lambda function already created in AWS Console (or via IaC)
#
# Usage:
#   ./deploy_lambda.sh
#

set -euo pipefail

FUNCTION_NAME="go-wallify"
LAMBDA_ARCH="${LAMBDA_ARCH:-arm64}"

echo "Building Lambda binary for linux/${LAMBDA_ARCH}..."
GOOS=linux GOARCH="$LAMBDA_ARCH" CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap .

echo "Packaging into deployment zip..."
zip -j lambda-deploy.zip bootstrap

echo "Deploying to Lambda function: $FUNCTION_NAME..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://lambda-deploy.zip \
  > /dev/null

echo "Deployment successful."
echo "Cleaning up build artifacts..."
rm -f bootstrap lambda-deploy.zip

echo "Deployment complete."
