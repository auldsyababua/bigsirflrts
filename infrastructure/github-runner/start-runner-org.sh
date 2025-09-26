#!/bin/bash
set -e

# Organization runner configuration
# This version registers the runner at organization level

# Check if runner is already configured
if [ ! -f .runner ]; then
    echo "Configuring GitHub Actions runner for organization..."
    
    # Check for GITHUB_PAT for automatic token fetching
    if [ -n "$GITHUB_PAT" ]; then
        echo "Using PAT to fetch organization registration token..."
        
        # Extract organization from repository or use GITHUB_ORG
        if [ -n "$GITHUB_ORG" ]; then
            ORG="$GITHUB_ORG"
        elif [ -n "$GITHUB_REPOSITORY" ]; then
            ORG=$(echo $GITHUB_REPOSITORY | cut -d'/' -f1)
        else
            echo "Error: GITHUB_ORG or GITHUB_REPOSITORY required"
            exit 1
        fi
        
        echo "Registering runner for organization: $ORG"
        
        # Fetch registration token using PAT for organization
        RESPONSE=$(curl -s -X POST \
            -H "Authorization: token ${GITHUB_PAT}" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/orgs/${ORG}/actions/runners/registration-token")
        
        # Extract token from response
        REG_TOKEN=$(echo "$RESPONSE" | jq -r '.token')
        
        if [ "$REG_TOKEN" = "null" ] || [ -z "$REG_TOKEN" ]; then
            echo "Error: Failed to get registration token"
            echo "Response: $RESPONSE"
            echo "Make sure your PAT has 'admin:org' scope"
            exit 1
        fi
        
        echo "Successfully obtained organization registration token"
        GITHUB_TOKEN="$REG_TOKEN"
    elif [ -z "$GITHUB_TOKEN" ]; then
        echo "Error: Either GITHUB_PAT or GITHUB_TOKEN must be provided"
        echo "  GITHUB_PAT: A Personal Access Token with admin:org scope (permanent)"
        echo "  GITHUB_TOKEN: A registration token (expires in 1 hour)"
        exit 1
    fi
    
    # Organization URL
    ORG_URL="https://github.com/${ORG}"
    
    # Optional: runner name and labels
    RUNNER_NAME=${RUNNER_NAME:-"org-runner-$(hostname)"}
    RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,organization,local,fast,docker"}
    
    # Configure the runner with --replace to handle existing runner names
    ./config.sh \
        --url "${ORG_URL}" \
        --token "${GITHUB_TOKEN}" \
        --name "${RUNNER_NAME}" \
        --labels "${RUNNER_LABELS}" \
        --unattended \
        --replace
else
    echo "Runner already configured, starting..."
fi

# Clean up any previous runs
if [ -d "_work" ]; then
    echo "Cleaning up previous work directory..."
    rm -rf _work/*
fi

# Start the runner
echo "Starting GitHub Actions runner for organization..."
./run.sh