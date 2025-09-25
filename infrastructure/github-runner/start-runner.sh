#!/bin/bash
set -e

# Check if runner is already configured
if [ ! -f .runner ]; then
    echo "Configuring GitHub Actions runner..."
    
    # Required environment variables
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "Error: GITHUB_TOKEN environment variable is required"
        exit 1
    fi
    
    if [ -z "$GITHUB_REPOSITORY" ]; then
        echo "Error: GITHUB_REPOSITORY environment variable is required (format: owner/repo)"
        exit 1
    fi
    
    # Optional: runner name and labels
    RUNNER_NAME=${RUNNER_NAME:-"local-fast-runner-$(hostname)"}
    RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,local,fast,docker"}
    
    # Configure the runner
    ./config.sh \
        --url "https://github.com/${GITHUB_REPOSITORY}" \
        --token "${GITHUB_TOKEN}" \
        --name "${RUNNER_NAME}" \
        --labels "${RUNNER_LABELS}" \
        --unattended \
        --replace \
        --ephemeral
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