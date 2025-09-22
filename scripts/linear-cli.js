#!/usr/bin/env node

/**
 * Linear CLI - Command line interface for Linear integration
 * Usage: node scripts/linear-cli.js [command] [options]
 */

import { config } from 'dotenv';
import { getLinearClient } from '../lib/linear-integration.js';
import { program } from 'commander';
import chalk from 'chalk';

// Load environment variables
config();

const linear = getLinearClient();

program
  .name('linear-cli')
  .description('CLI for Linear integration with BMAD')
  .version('1.0.0');

// List issues command
program
  .command('list')
  .description('List issues in BigSirFLRTS project')
  .option('-s, --state <state>', 'Filter by state')
  .option('-a, --assignee <assignee>', 'Filter by assignee')
  .option('-l, --limit <number>', 'Limit results', '10')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📋 Fetching Linear issues...\n'));

      const issues = await linear.getProjectIssues({
        state: options.state,
        assignee: options.assignee,
        limit: parseInt(options.limit)
      });

      if (issues.length === 0) {
        console.log(chalk.yellow('No issues found'));
        return;
      }

      issues.forEach(issue => {
        const state = chalk.gray(`[${issue.state.name}]`);
        const priority = issue.priority > 0 ? chalk.red(`P${issue.priority}`) : '';
        console.log(`${chalk.green(issue.identifier)} ${state} ${issue.title} ${priority}`);
        if (issue.assignee) {
          console.log(`  👤 ${issue.assignee.name}`);
        }
        if (issue.description) {
          console.log(chalk.gray(`  ${issue.description.substring(0, 100)}...`));
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Create issue command
program
  .command('create <title>')
  .description('Create a new issue')
  .option('-d, --description <desc>', 'Issue description')
  .option('-p, --priority <number>', 'Priority (1-4)', '0')
  .action(async (title, options) => {
    try {
      console.log(chalk.blue('✨ Creating Linear issue...\n'));

      const result = await linear.createIssue({
        title,
        description: options.description,
        priority: parseInt(options.priority)
      });

      // The create response includes the issue in the result
      const issue = result.issue || result;

      console.log(chalk.green(`✅ Created issue: ${title}`));
      if (issue.identifier) {
        console.log(chalk.gray(`   Issue ID: ${issue.identifier}`));
      }
      if (issue.url) {
        console.log(chalk.gray(`   URL: ${issue.url}`));
      }
      console.log(chalk.gray(`   Project: BigSirFLRTS`));
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Get issue details
program
  .command('get <issueId>')
  .description('Get issue details')
  .action(async (issueId) => {
    try {
      console.log(chalk.blue(`🔍 Fetching issue ${issueId}...\n`));

      const context = await linear.generateBMADContext(issueId);

      console.log(chalk.green(`Issue: ${context.issue.identifier}`));
      console.log(`Title: ${context.issue.title}`);
      console.log(`State: ${context.issue.state.name}`);
      console.log(`URL: ${context.issue.url}`);

      if (context.issue.description) {
        console.log(chalk.gray('\nDescription:'));
        console.log(context.issue.description);
      }

      if (context.issue.assignee) {
        console.log(`\n👤 Assigned to: ${context.issue.assignee.name}`);
      }

      if (context.issue.gitBranchName) {
        console.log(`\n🌿 Branch: ${context.issue.gitBranchName}`);
      }

      const comments = await context.context.comments;
      if (comments && comments.nodes.length > 0) {
        console.log(chalk.gray('\n💬 Comments:'));
        comments.nodes.forEach(comment => {
          console.log(`  - ${comment.body.substring(0, 100)}...`);
        });
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Sync from git branch
program
  .command('sync-branch <branchName>')
  .description('Sync Linear issue from git branch name')
  .action(async (branchName) => {
    try {
      console.log(chalk.blue(`🔄 Syncing from branch: ${branchName}\n`));

      const issue = await linear.syncFromGitBranch(branchName);

      if (issue) {
        console.log(chalk.green(`✅ Synced issue ${issue.identifier}: ${issue.title}`));
        console.log(`   Status: ${issue.state.name}`);
      } else {
        console.log(chalk.yellow('No matching Linear issue found for this branch'));
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Get current cycle
program
  .command('cycle')
  .description('Get current cycle information')
  .action(async () => {
    try {
      console.log(chalk.blue('📅 Fetching current cycle...\n'));

      const cycle = await linear.getCurrentCycle();

      if (cycle) {
        console.log(chalk.green(`Current Cycle: ${cycle.name || cycle.number}`));
        console.log(`Start: ${new Date(cycle.startsAt).toLocaleDateString()}`);
        console.log(`End: ${new Date(cycle.endsAt).toLocaleDateString()}`);

        const issues = await cycle.issues();
        console.log(`\nIssues in cycle: ${issues.nodes.length}`);
      } else {
        console.log(chalk.yellow('No active cycle found'));
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

program.parse();