#!/bin/bash

# Cloudflare R2 Setup Script
# This script creates and configures R2 bucket for OpenProject file storage

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BUCKET_NAME="${R2_BUCKET_NAME:-openproject-attachments}"
BUCKET_LOCATION="${R2_BUCKET_LOCATION:-nam}"  # North America

echo -e "${GREEN}=== Cloudflare R2 Setup Script ===${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: Wrangler CLI is not installed${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
echo -e "${YELLOW}Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare. Running login...${NC}"
    wrangler login
fi

# Create R2 bucket
echo -e "${GREEN}Creating R2 bucket: ${BUCKET_NAME}${NC}"
if wrangler r2 bucket create "${BUCKET_NAME}" --location="${BUCKET_LOCATION}" 2>/dev/null; then
    echo -e "${GREEN}✓ Bucket created successfully${NC}"
else
    echo -e "${YELLOW}Bucket might already exist or creation failed${NC}"
    # Check if bucket exists
    if wrangler r2 bucket list | grep -q "${BUCKET_NAME}"; then
        echo -e "${GREEN}✓ Bucket already exists${NC}"
    else
        echo -e "${RED}✗ Failed to create bucket${NC}"
        exit 1
    fi
fi

# Create CORS configuration
echo -e "${GREEN}Creating CORS configuration...${NC}"
cat > /tmp/r2-cors.json << EOF
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply CORS rules
echo -e "${GREEN}Applying CORS rules to bucket...${NC}"
wrangler r2 bucket cors put "${BUCKET_NAME}" --rules /tmp/r2-cors.json

# Create lifecycle rules for multipart upload cleanup
echo -e "${GREEN}Creating lifecycle rules...${NC}"
cat > /tmp/r2-lifecycle.json << EOF
{
  "rules": [
    {
      "id": "cleanup-incomplete-multipart-uploads",
      "status": "Enabled",
      "abortIncompleteMultipartUpload": {
        "daysAfterInitiation": 7
      }
    }
  ]
}
EOF

# Note: Lifecycle rules might need to be set via Dashboard
echo -e "${YELLOW}Note: Lifecycle rules may need to be configured in Cloudflare Dashboard${NC}"

# Get bucket info
echo -e "${GREEN}Fetching bucket information...${NC}"
wrangler r2 bucket info "${BUCKET_NAME}"

# Generate R2 API token instructions
echo -e "${GREEN}=== R2 API Token Setup ===${NC}"
echo -e "${YELLOW}To create R2 API credentials:${NC}"
echo "1. Go to: https://dash.cloudflare.com/?to=/:account/r2/api-tokens"
echo "2. Click 'Create API token'"
echo "3. Select permissions:"
echo "   - Object Read & Write for bucket: ${BUCKET_NAME}"
echo "4. Click 'Create API Token'"
echo "5. Save the credentials:"
echo ""
echo -e "${GREEN}Add these to your .env file:${NC}"
echo "R2_ACCESS_KEY_ID=<your-access-key-id>"
echo "R2_SECRET_ACCESS_KEY=<your-secret-access-key>"
echo "R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com"
echo "R2_BUCKET_NAME=${BUCKET_NAME}"
echo "R2_REGION=auto"
echo ""

# Generate public bucket URL (if needed)
echo -e "${GREEN}=== Public Access Configuration ===${NC}"
echo "If you need public access for attachments:"
echo "1. Go to R2 bucket settings in Cloudflare Dashboard"
echo "2. Navigate to Settings > Public Access"
echo "3. Enable 'Allow public access'"
echo "4. Configure custom domain if needed"
echo ""

# Create example test script
cat > /tmp/test-r2-connection.sh << 'EOF'
#!/bin/bash
# Test R2 Connection Script

# Load environment variables
source .env.production

# Test with AWS CLI (S3 compatible)
aws s3 ls s3://${R2_BUCKET_NAME}/ \
  --endpoint-url ${R2_ENDPOINT} \
  --region ${R2_REGION}

echo "If you see no errors, R2 connection is working!"
EOF

chmod +x /tmp/test-r2-connection.sh
echo -e "${GREEN}Test script created at: /tmp/test-r2-connection.sh${NC}"

echo -e "${GREEN}=== R2 Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Create API token in Cloudflare Dashboard"
echo "2. Add credentials to .env.production file"
echo "3. Test connection with: /tmp/test-r2-connection.sh"

# Clean up temp files
rm -f /tmp/r2-cors.json /tmp/r2-lifecycle.json