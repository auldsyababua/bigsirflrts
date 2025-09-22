#!/usr/bin/env node

/**
 * Linear Webhook Handler
 * Processes Linear webhook events and triggers appropriate BMAD agents
 */

const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  LINEAR_WEBHOOK_SECRET: process.env.LINEAR_WEBHOOK_SECRET,
  BMAD_AGENT_PATH: '.bmad-core/agents',
  GIT_BRANCH_PREFIX: 'colin/',
  PROJECT_ID: '9d089be4-a284-4879-9b67-f472abecf998', // BigSirFLRTS
};

/**
 * Verify Linear webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle Issue events
 */
async function handleIssueEvent(event, data) {
  const { issue } = data;
  console.log(`Processing ${event} for issue ${issue.identifier}: ${issue.title}`);

  switch (event) {
    case 'Issue.created':
      await handleIssueCreated(issue);
      break;
    case 'Issue.updated':
      await handleIssueUpdated(issue);
      break;
    case 'Issue.deleted':
      await handleIssueDeleted(issue);
      break;
    default:
      console.log(`Unhandled issue event: ${event}`);
  }
}

/**
 * Handle new issue creation
 */
async function handleIssueCreated(issue) {
  // Create feature branch if issue is assigned
  if (issue.assignee) {
    const branchName = `${CONFIG.GIT_BRANCH_PREFIX}${issue.identifier.toLowerCase()}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50)}`;

    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      console.log(`Created branch: ${branchName}`);
    } catch (error) {
      console.error('Failed to create branch:', error.message);
    }
  }

  // Trigger BMAD agent based on issue labels
  if (issue.labels?.some(label => label.name === 'needs-prd')) {
    console.log('Triggering PM Agent for PRD generation...');
    // TODO: Implement BMAD PM agent trigger
  }

  if (issue.labels?.some(label => label.name === 'needs-architecture')) {
    console.log('Triggering Architect Agent for design...');
    // TODO: Implement BMAD Architect agent trigger
  }

  // Log to project activity file
  logActivity('CREATED', issue);
}

/**
 * Handle issue updates
 */
async function handleIssueUpdated(issue) {
  // Handle status changes
  if (issue.state) {
    console.log(`Issue ${issue.identifier} status changed to: ${issue.state.name}`);

    switch (issue.state.name) {
      case 'In Progress':
        // Ensure branch exists
        ensureFeatureBranch(issue);
        break;
      case 'In Review':
        // Create PR if not exists
        createPullRequest(issue);
        break;
      case 'Done':
        // Merge and cleanup
        mergeAndCleanup(issue);
        break;
    }
  }

  // Log to project activity file
  logActivity('UPDATED', issue);
}

/**
 * Handle issue deletion
 */
async function handleIssueDeleted(issue) {
  console.log(`Issue ${issue.identifier} was deleted`);
  logActivity('DELETED', issue);
}

/**
 * Ensure feature branch exists for issue
 */
function ensureFeatureBranch(issue) {
  const branchName = issue.gitBranchName ||
    `${CONFIG.GIT_BRANCH_PREFIX}${issue.identifier.toLowerCase()}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50)}`;

  try {
    // Check if branch exists
    execSync(`git show-ref --verify --quiet refs/heads/${branchName}`);
    console.log(`Branch exists: ${branchName}`);
  } catch {
    // Create branch if it doesn't exist
    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      console.log(`Created branch: ${branchName}`);
    } catch (error) {
      console.error('Failed to create branch:', error.message);
    }
  }
}

/**
 * Create pull request for issue
 */
function createPullRequest(issue) {
  console.log(`Creating PR for issue ${issue.identifier}`);
  // TODO: Implement GitHub PR creation via API
}

/**
 * Merge PR and cleanup branch
 */
function mergeAndCleanup(issue) {
  console.log(`Merging and cleaning up for issue ${issue.identifier}`);
  // TODO: Implement merge and cleanup logic
}

/**
 * Log activity to file
 */
function logActivity(action, issue) {
  const fs = require('fs');
  const logFile = 'docs/linear-activity.log';
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action}: ${issue.identifier} - ${issue.title}\n`;

  fs.appendFileSync(logFile, logEntry);
}

/**
 * Main webhook handler
 */
async function handleWebhook(request) {
  const { body, headers } = request;

  // Verify webhook signature
  if (CONFIG.LINEAR_WEBHOOK_SECRET) {
    const signature = headers['linear-signature'];
    if (!verifyWebhookSignature(JSON.stringify(body), signature, CONFIG.LINEAR_WEBHOOK_SECRET)) {
      throw new Error('Invalid webhook signature');
    }
  }

  const { action, data, type } = body;
  const event = `${type}.${action}`;

  console.log(`Received Linear webhook: ${event}`);

  // Route events to appropriate handlers
  if (type === 'Issue') {
    await handleIssueEvent(event, data);
  } else if (type === 'Project') {
    console.log(`Project event: ${event}`);
    // TODO: Handle project events
  } else if (type === 'Comment') {
    console.log(`Comment event: ${event}`);
    // TODO: Handle comment events
  } else {
    console.log(`Unhandled event type: ${type}`);
  }

  return { success: true };
}

// Export for use as module
module.exports = { handleWebhook, verifyWebhookSignature };

// CLI execution
if (require.main === module) {
  console.log('Linear Webhook Handler');
  console.log('======================');
  console.log('This script should be called by your webhook endpoint.');
  console.log('For testing, you can simulate events using the Linear CLI.');
}