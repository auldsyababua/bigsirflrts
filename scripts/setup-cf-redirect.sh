#!/bin/bash

# Setup HTTP to HTTPS redirect for ops.10nz.tools via Cloudflare Page Rules

PROJECT_DIR="/Users/colinaulds/Desktop/projects/bigsirflrts"
source "$PROJECT_DIR/.env" 2>/dev/null

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "Error: Cloudflare API token not found. Run wrangler-setup.sh first"
    exit 1
fi

echo "Setting up HTTP to HTTPS redirect for ops.10nz.tools..."

# Check if page rule already exists
EXISTING_RULES=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")

# Check if we already have a rule for ops.10nz.tools
if echo "$EXISTING_RULES" | grep -q "ops.10nz.tools"; then
    echo "Page rule already exists for ops.10nz.tools"
    echo "Existing rules:"
    echo "$EXISTING_RULES" | jq '.result[] | select(.targets[].constraint.value | contains("ops.10nz.tools")) | {id, status, targets, actions}'
else
    echo "Creating new page rule for HTTP to HTTPS redirect..."

    # Create page rule
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{
            "targets": [
                {
                    "target": "url",
                    "constraint": {
                        "operator": "matches",
                        "value": "http://ops.10nz.tools/*"
                    }
                }
            ],
            "actions": [
                {
                    "id": "forwarding_url",
                    "value": {
                        "url": "https://ops.10nz.tools/$1",
                        "status_code": 301
                    }
                }
            ],
            "priority": 1,
            "status": "active"
        }')

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

    if [ "$SUCCESS" = "true" ]; then
        echo "✓ Page rule created successfully!"
        echo "$RESPONSE" | jq '.result | {id, status, targets, actions}'
    else
        echo "✗ Failed to create page rule"
        echo "$RESPONSE" | jq '.errors'
    fi
fi

# Also ensure SSL is set to Full or Strict
echo -e "\nChecking SSL settings..."
SSL_MODE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result.value')

echo "Current SSL mode: $SSL_MODE"

if [ "$SSL_MODE" != "full" ] && [ "$SSL_MODE" != "strict" ]; then
    echo "Updating SSL mode to Full..."
    curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"value":"full"}' | jq '.success'
fi

# Enable Always Use HTTPS
echo -e "\nEnabling Always Use HTTPS..."
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' | jq '.success'

echo -e "\n✓ Setup complete! HTTP requests to ops.10nz.tools will now redirect to HTTPS"