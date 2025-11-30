#!/bin/bash

# Script to generate amplify_outputs.json from CloudFormation stack outputs
# Usage: ./generate-amplify-outputs.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="project-portal-backend-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-west-2}

echo "🔍 Fetching outputs from stack: ${STACK_NAME} in region: ${REGION}"

# Fetch stack outputs
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs' \
  --output json)

if [ -z "$OUTPUTS" ] || [ "$OUTPUTS" = "null" ]; then
  echo "❌ Error: Could not fetch stack outputs. Make sure the stack is deployed."
  exit 1
fi

# Extract values from outputs
USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyAuthUserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyAuthUserPoolClientId") | .OutputValue')
IDENTITY_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyAuthIdentityPoolId") | .OutputValue')
AUTH_REGION=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyAuthRegion") | .OutputValue')
GRAPHQL_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyDataGraphQLEndpoint") | .OutputValue')
DATA_REGION=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyDataRegion") | .OutputValue')
DEFAULT_AUTH_MODE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AmplifyDataDefaultAuthMode") | .OutputValue')

# Validate required outputs
if [ -z "$USER_POOL_ID" ] || [ -z "$USER_POOL_CLIENT_ID" ] || [ -z "$GRAPHQL_ENDPOINT" ]; then
  echo "❌ Error: Missing required stack outputs"
  echo "USER_POOL_ID: $USER_POOL_ID"
  echo "USER_POOL_CLIENT_ID: $USER_POOL_CLIENT_ID"
  echo "GRAPHQL_ENDPOINT: $GRAPHQL_ENDPOINT"
  exit 1
fi

# Create amplify_outputs.json
cat > amplify_outputs.json << EOF
{
  "version": "1",
  "auth": {
    "user_pool_id": "${USER_POOL_ID}",
    "user_pool_client_id": "${USER_POOL_CLIENT_ID}",
    "identity_pool_id": "${IDENTITY_POOL_ID}",
    "aws_region": "${AUTH_REGION}",
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_uppercase": true,
      "require_numbers": true,
      "require_symbols": true
    }
  },
  "data": {
    "url": "${GRAPHQL_ENDPOINT}",
    "aws_region": "${DATA_REGION}",
    "default_authorization_type": "${DEFAULT_AUTH_MODE}",
    "authorization_types": ["AMAZON_COGNITO_USER_POOLS"],
    "model_introspection": {
      "version": 1,
      "models": {},
      "enums": {},
      "nonModels": {}
    }
  }
}
EOF

# Copy to src directory
cp amplify_outputs.json ../src/amplify_outputs.json

echo "✅ Generated amplify_outputs.json"
echo "📁 Saved to:"
echo "   - cdk/amplify_outputs.json"
echo "   - src/amplify_outputs.json"
echo ""
echo "📝 Note: Model introspection schema needs to be generated separately."
echo "   Run: npx @aws-amplify/backend-cli generate graphql-client-code"
