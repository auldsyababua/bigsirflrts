#!/bin/bash
set -e

# This script gets a registration token from GitHub API
# Requires: GitHub Personal Access Token with 'repo' and 'admin:org' scopes

echo "GitHub Actions Runner Registration Helper"
echo "========================================="

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    exit 1
fi

# Get GitHub token
if [ -z "$GITHUB_PAT" ]; then
    echo -n "Enter your GitHub Personal Access Token (with repo scope): "
    read -s GITHUB_PAT
    echo
fi

# Get repository
if [ -z "$GITHUB_REPOSITORY" ]; then
    echo -n "Enter repository (format: owner/repo): "
    read GITHUB_REPOSITORY
fi

# Validate inputs
if [ -z "$GITHUB_PAT" ] || [ -z "$GITHUB_REPOSITORY" ]; then
    echo "Error: GitHub token and repository are required"
    exit 1
fi

# Parse owner and repo
OWNER=$(echo $GITHUB_REPOSITORY | cut -d'/' -f1)
REPO=$(echo $GITHUB_REPOSITORY | cut -d'/' -f2)

echo "Getting registration token for $GITHUB_REPOSITORY..."

# Get registration token from GitHub API
RESPONSE=$(curl -s -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_PAT" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$OWNER/$REPO/actions/runners/registration-token")

# Check if request was successful
if echo "$RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    TOKEN=$(echo "$RESPONSE" | jq -r '.token')
    echo "Successfully obtained registration token!"
    echo
    echo "To use this token, add it to your .env file:"
    echo "GITHUB_TOKEN=$TOKEN"
    echo
    echo "Note: This token expires in 1 hour"
    
    # Optionally save to .env
    echo -n "Save to .env file? (y/n): "
    read SAVE_ENV
    if [ "$SAVE_ENV" = "y" ]; then
        cat > .env << EOF
# GitHub Runner Configuration
GITHUB_TOKEN=$TOKEN
GITHUB_REPOSITORY=$GITHUB_REPOSITORY
RUNNER_NAME=local-fast-runner-$(hostname)
RUNNER_LABELS=self-hosted,local,fast,docker
EOF
        echo "Configuration saved to .env"
        echo "You can now run: make start"
    fi
else
    echo "Error getting registration token:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi