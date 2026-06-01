#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"
TENANT_NAME="${1:-My App}"

echo "Registering tenant: $TENANT_NAME"

RESPONSE=$(curl -s -X POST "$API_URL/v1/tenants/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$TENANT_NAME\"}")

API_KEY=$(echo "$RESPONSE" | grep -o '"api_key":"ow_[^"]*"' | sed 's/"api_key":"//;s/"//')

if [ -z "$API_KEY" ]; then
    echo "Failed to register tenant"
    echo "$RESPONSE"
    exit 1
fi

echo "Tenant registered!"
echo "API Key: $API_KEY"
echo ""
echo "Save this key. You'll need it for SDK initialization."
echo ""
echo "Quick test:"
echo "  curl -H 'Authorization: Bearer $API_KEY' $API_URL/v1/wallets"
