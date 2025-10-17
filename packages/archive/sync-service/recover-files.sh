#!/bin/bash

# Create directories
mkdir -p docs/stories
mkdir -p docs/qa/assessments
mkdir -p docs/qa/gates  
mkdir -p docs/qa/implementation
mkdir -p docs/qa/templates
mkdir -p docs/qa/test-scenarios

# Download all story files
echo "Recovering story files..."
stories=(
  "1.1.deploy-openproject-docker-digitalocean.md"
  "1.2.postgresql-validation.md"
  "1.3.n8n-production-deployment.md"
  "1.4.supabase-edge-functions.md"
  "1.5.supabase-webhooks.md"
  "1.6.redis-queue-configuration.md"
  "1.7.monitoring-observability.md"
  "1.8.migrate-monitoring-digitalocean.md"
  "2.1.telegram-task-creation.md"
  "2.2.telegram-reminder-system.md"
  "2.3.telegram-inline-keyboards.md"
  "2.4.error-recovery.md"
  "2.5.telegram-command-parser.md"
  "2.6.telegram-user-context.md"
  "3.1.openproject-api-workflows.md"
  "3.2.openproject-webhooks.md"
  "3.3.batch-sync-workflows.md"
  "3.4.openai-context-injection-mvp.md"
  "3.5.timezone-conversion-logic.md"
  "4.1.lists-interface.md"
  "4.2.list-commands.md"
  "4.3.list-templates-system.md"
  "4.4.list-sharing-permissions.md"
  "4.5.list-notifications.md"
  "INFRA-001-directory-consolidation.md"
  "INFRA-002-container-naming-standardization.md"
)

for story in "${stories[@]}"; do
  echo "  Downloading $story..."
  curl -sL "https://raw.githubusercontent.com/auldsyababua/bigsirflrts/88280de/docs/stories/$story" > "docs/stories/$story"
done

echo "Story files recovered!"
