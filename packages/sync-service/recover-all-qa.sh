#!/bin/bash

echo "Recovering all QA files from GitHub..."

# Base URL for raw GitHub content
BASE_URL="https://raw.githubusercontent.com/auldsyababua/bigsirflrts/88280de"

# Create directories
mkdir -p docs/qa/assessments
mkdir -p docs/qa/gates
mkdir -p docs/qa/implementation
mkdir -p docs/qa/templates
mkdir -p docs/qa/test-scenarios

# QA Assessments
echo "Downloading assessments..."
curl -sL "$BASE_URL/docs/qa/assessments/1.1-test-design-mvp-20250109.md" > "docs/qa/assessments/1.1-test-design-mvp-20250109.md"
curl -sL "$BASE_URL/docs/qa/assessments/1.7-test-design-20250916.md" > "docs/qa/assessments/1.7-test-design-20250916.md"
curl -sL "$BASE_URL/docs/qa/assessments/1.7-trace-20250916.md" > "docs/qa/assessments/1.7-trace-20250916.md"
curl -sL "$BASE_URL/docs/qa/assessments/testing-debt-assessment.md" > "docs/qa/assessments/testing-debt-assessment.md"

# QA Gates
echo "Downloading gate files..."
curl -sL "$BASE_URL/docs/qa/gates/1.1-deploy-openproject-docker-digitalocean.yml" > "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-EXECUTION-COMPLETE.yml" > "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-EXECUTION-COMPLETE.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-FINAL.yml" > "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-FINAL.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-RESOLVED.yml" > "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-RESOLVED.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-VERIFICATION.yml" > "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-VERIFICATION.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-VERIFICATION-2025-09-18.yml" > "docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-VERIFICATION-2025-09-18.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.2-postgresql-validation.yml" > "docs/qa/gates/1.2-postgresql-validation.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.3-n8n-production-deployment.yml" > "docs/qa/gates/1.3-n8n-production-deployment.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.4-supabase-edge-functions.yml" > "docs/qa/gates/1.4-supabase-edge-functions.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.5-supabase-webhooks.yml" > "docs/qa/gates/1.5-supabase-webhooks.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.7-monitoring-observability.yml" > "docs/qa/gates/1.7-monitoring-observability.yml"
curl -sL "$BASE_URL/docs/qa/gates/1.8-migrate-monitoring-digitalocean.yml" > "docs/qa/gates/1.8-migrate-monitoring-digitalocean.yml"

# QA Implementation
echo "Downloading implementation guides..."
curl -sL "$BASE_URL/docs/qa/implementation/mvp-test-implementation-guide.md" > "docs/qa/implementation/mvp-test-implementation-guide.md"

# QA Templates
echo "Downloading templates..."
curl -sL "$BASE_URL/docs/qa/templates/retroactive-test-design-template.md" > "docs/qa/templates/retroactive-test-design-template.md"

# QA Test Scenarios
echo "Downloading test scenarios..."
curl -sL "$BASE_URL/docs/qa/test-scenarios/1.1-mvp-scenarios.md" > "docs/qa/test-scenarios/1.1-mvp-scenarios.md"

# Root level QA file
echo "Downloading root QA files..."
curl -sL "$BASE_URL/docs/qa/container-naming-audit.md" > "docs/qa/container-naming-audit.md"

echo "✅ All QA files recovered!"

# Count recovered files
echo ""
echo "Recovery Summary:"
echo "- Assessments: $(ls -1 docs/qa/assessments/*.md 2>/dev/null | wc -l) files"
echo "- Gates: $(ls -1 docs/qa/gates/*.yml 2>/dev/null | wc -l) files"
echo "- Implementation: $(ls -1 docs/qa/implementation/*.md 2>/dev/null | wc -l) files"
echo "- Templates: $(ls -1 docs/qa/templates/*.md 2>/dev/null | wc -l) files"
echo "- Test Scenarios: $(ls -1 docs/qa/test-scenarios/*.md 2>/dev/null | wc -l) files"
echo "- Root QA: 1 file"
echo ""
echo "Total: $(find docs/qa -type f \( -name "*.md" -o -name "*.yml" \) | wc -l) files recovered"