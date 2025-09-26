#!/bin/bash
set -e

# Check if runner is already configured
if [ ! -f .runner ]; then
    echo "Configuring GitHub Actions runner..."
    
    # Check for GITHUB_PAT for automatic token fetching
    if [ -n "$GITHUB_PAT" ]; then
        echo "Using PAT to fetch registration token..."
        
        if [ -z "$GITHUB_REPOSITORY" ]; then
            echo "Error: GITHUB_REPOSITORY environment variable is required (format: owner/repo)"
            exit 1
        fi
        
        # Parse owner and repo
        OWNER=$(echo $GITHUB_REPOSITORY | cut -d'/' -f1)
        REPO=$(echo $GITHUB_REPOSITORY | cut -d'/' -f2)
        
        # Fetch registration token using PAT
        RESPONSE=$(curl -s -X POST \
            -H "Authorization: token ${GITHUB_PAT}" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/repos/${OWNER}/${REPO}/actions/runners/registration-token")
        
        # Extract token from response
        REG_TOKEN=$(echo "$RESPONSE" | jq -r '.token')
        
        if [ "$REG_TOKEN" = "null" ] || [ -z "$REG_TOKEN" ]; then
            echo "Error: Failed to get registration token"
            echo "$RESPONSE"
            exit 1
        fi
        
        echo "Successfully obtained registration token"
        GITHUB_TOKEN="$REG_TOKEN"
    elif [ -z "$GITHUB_TOKEN" ]; then
        echo "Error: Either GITHUB_PAT or GITHUB_TOKEN must be provided"
        echo "  GITHUB_PAT: A Personal Access Token with repo scope (permanent)"
        echo "  GITHUB_TOKEN: A registration token (expires in 1 hour)"
        exit 1
    fi
    
    if [ -z "$GITHUB_REPOSITORY" ]; then
        echo "Error: GITHUB_REPOSITORY environment variable is required (format: owner/repo)"
        exit 1
    fi
    
    # Optional: runner name and labels
    RUNNER_NAME=${RUNNER_NAME:-"local-fast-runner-$(hostname)"}
    RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,local,fast,docker"}
    
    # Configure the runner with --replace to handle existing runner names
    ./config.sh \
        --url "https://github.com/${GITHUB_REPOSITORY}" \
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
echo "Starting GitHub Actions runner..."
./run.sh