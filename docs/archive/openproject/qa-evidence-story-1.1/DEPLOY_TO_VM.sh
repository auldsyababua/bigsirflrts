#!/bin/bash
# Deploy Test Suite to Digital Ocean VM
# This script copies all test files to the VM for execution

set -e

echo "=========================================="
echo "DEPLOYING TEST SUITE TO DIGITAL OCEAN VM"
echo "=========================================="
echo ""

# Configuration
VM_IP="165.227.216.172"
VM_USER="root"
REMOTE_DIR="/root/infrastructure/qa-evidence/story-1.1"
LOCAL_DIR="./infrastructure/qa-evidence/story-1.1"

echo "Target VM: $VM_USER@$VM_IP"
echo "Remote directory: $REMOTE_DIR"
echo ""

# Check SSH connectivity
echo "Checking SSH connectivity..."
if ssh -o ConnectTimeout=5 $VM_USER@$VM_IP "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ Cannot connect to VM via SSH"
    echo "Please ensure:"
    echo "  1. VM is running"
    echo "  2. SSH key is configured"
    echo "  3. Network connectivity exists"
    exit 1
fi

# Create remote directory
echo ""
echo "Creating remote directory..."
ssh $VM_USER@$VM_IP "mkdir -p $REMOTE_DIR"
echo "✅ Remote directory created"

# Copy test files
echo ""
echo "Copying test files to VM..."

# List of files to copy
FILES=(
    "test-1-container-health-monitoring.sh"
    "test-2-database-persistence.sh"
    "test-2-verify.sh"
    "test-3-database-error-handling.sh"
    "test-4-cloudflare-tunnel-recovery.sh"
    "test-5-load-testing.sh"
    "test-6-resource-monitoring.sh"
    "test-7-health-endpoints.sh"
    "RUN_ALL_TESTS.sh"
    "README.md"
    "EXECUTION_GUIDE.md"
)

# Copy each file
for file in "${FILES[@]}"; do
    if [ -f "$LOCAL_DIR/$file" ]; then
        echo "  Copying: $file"
        scp "$LOCAL_DIR/$file" "$VM_USER@$VM_IP:$REMOTE_DIR/" 2>/dev/null || {
            echo "    ⚠️  File not found locally, skipping: $file"
        }
    fi
done

echo "✅ Files copied to VM"

# Set execute permissions
echo ""
echo "Setting execute permissions..."
ssh $VM_USER@$VM_IP "chmod +x $REMOTE_DIR/*.sh"
echo "✅ Execute permissions set"

# Verify deployment
echo ""
echo "Verifying deployment..."
echo "Files on VM:"
ssh $VM_USER@$VM_IP "ls -la $REMOTE_DIR/"

# Install dependencies
echo ""
echo "Checking/Installing dependencies on VM..."

# Check for Apache Bench
ssh $VM_USER@$VM_IP "command -v ab >/dev/null 2>&1 || apt-get update && apt-get install -y apache2-utils"
echo "✅ Apache Bench available"

# Check for bc (calculator)
ssh $VM_USER@$VM_IP "command -v bc >/dev/null 2>&1 || apt-get install -y bc"
echo "✅ bc calculator available"

# Check for curl
ssh $VM_USER@$VM_IP "command -v curl >/dev/null 2>&1 || apt-get install -y curl"
echo "✅ curl available"

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Test suite successfully deployed to VM!"
echo ""
echo "Next steps:"
echo "1. SSH into the VM:"
echo "   ssh $VM_USER@$VM_IP"
echo ""
echo "2. Navigate to test directory:"
echo "   cd $REMOTE_DIR"
echo ""
echo "3. Run all tests:"
echo "   ./RUN_ALL_TESTS.sh"
echo ""
echo "Or run individual tests as needed (see EXECUTION_GUIDE.md)"
echo ""
echo "Good luck with the QA validation! 🚀"