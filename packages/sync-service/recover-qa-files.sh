#!/bin/bash

echo "Recovering QA directory files..."

# Function to download files from GitHub
download_from_github() {
  local path=$1
  local base_url="https://raw.githubusercontent.com/auldsyababua/bigsirflrts/88280de"
  
  echo "  Downloading $path..."
  mkdir -p "$(dirname "$path")"
  curl -sL "$base_url/$path" > "$path"
}

# QA Assessments
download_from_github "docs/qa/assessments/1.1-test-design-mvp-20250109.md"
download_from_github "docs/qa/assessments/1.7-test-design-20250916.md"
download_from_github "docs/qa/assessments/1.7-trace-20250916.md"
download_from_github "docs/qa/assessments/testing-debt-assessment.md"

# QA Gates 
download_from_github "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean.yml"
download_from_github "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-EXECUTION-COMPLETE.yml"
download_from_github "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-FINAL.yml"
download_from_github "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-RESOLVED.yml"
download_from_github "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-VERIFICATION.yml"
download_from_github "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-VERIFICATION-2025-09-18.yml"
download_from_github "docs/qa/gates/1.2-postgresql-validation.yml"
download_from_github "docs/qa/gates/1.3-n8n-production-deployment.yml"
download_from_github "docs/qa/gates/1.4-supabase-edge-functions.yml"
download_from_github "docs/qa/gates/1.5-supabase-webhooks.yml"
download_from_github "docs/qa/gates/1.7-monitoring-observability.yml"
download_from_github "docs/qa/gates/1.8-migrate-monitoring-digitalocean.yml"

# QA Implementation
download_from_github "docs/qa/implementation/mvp-test-implementation-guide.md"

# QA Templates
download_from_github "docs/qa/templates/retroactive-test-design-template.md"

# QA Test Scenarios
download_from_github "docs/qa/test-scenarios/1.1-mvp-scenarios.md"

# Root level QA file
download_from_github "docs/qa/container-naming-audit.md"

echo "QA files recovered!"
