#!/usr/bin/env node

/**
 * Setup Linear Cycles for Sprint Planning
 * Creates bi-weekly cycles for the next 3 months
 */

import { config } from 'dotenv';
import { LinearClient } from '@linear/sdk';
import { program } from 'commander';
import chalk from 'chalk';

// Load environment variables
config();

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY
});

const TEAM_ID = process.env.LINEAR_TEAM_ID || '2b0b568f-e5a6-40ac-866b-367a2564046a';

program
  .name('setup-cycles')
  .description('Setup Linear cycles for sprint planning')
  .version('1.0.0');

program
  .command('create')
  .description('Create cycles for the next period')
  .option('-w, --weeks <number>', 'Cycle duration in weeks', '2')
  .option('-c, --count <number>', 'Number of cycles to create', '6')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)', getNextMonday())
  .action(async (options) => {
    try {
      console.log(chalk.blue('📅 Setting up Linear cycles...\n'));

      const team = await linear.team(TEAM_ID);
      const existingCycles = await team.cycles();

      console.log(chalk.gray(`Found ${existingCycles.nodes.length} existing cycles\n`));

      const startDate = new Date(options.start);
      const weekDuration = parseInt(options.weeks);
      const cycleCount = parseInt(options.count);

      console.log(chalk.yellow('Creating cycles:'));
      console.log(`  Start: ${startDate.toDateString()}`);
      console.log(`  Duration: ${weekDuration} weeks each`);
      console.log(`  Count: ${cycleCount} cycles\n`);

      const cycles = [];
      let currentStart = new Date(startDate);

      for (let i = 0; i < cycleCount; i++) {
        const cycleEnd = new Date(currentStart);
        cycleEnd.setDate(cycleEnd.getDate() + weekDuration * 7 - 1);

        const cycleNumber = existingCycles.nodes.length + i + 1;
        const cycleName = `Sprint ${cycleNumber}`;

        cycles.push({
          name: cycleName,
          startsAt: currentStart.toISOString(),
          endsAt: cycleEnd.toISOString(),
          teamId: TEAM_ID,
          description: `${weekDuration}-week sprint (${currentStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()})`
        });

        console.log(chalk.green(`  ${cycleName}: ${currentStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()}`));

        currentStart = new Date(cycleEnd);
        currentStart.setDate(currentStart.getDate() + 1);
      }

      // Create cycles
      const confirm = await promptUser('\nCreate these cycles? (y/N): ');
      if (confirm.toLowerCase() === 'y') {
        for (const cycle of cycles) {
          await linear.createCycle(cycle);
          console.log(chalk.green(`✅ Created ${cycle.name}`));
        }
        console.log(chalk.green('\n✨ Cycles created successfully!'));
      } else {
        console.log(chalk.yellow('Cancelled'));
      }

    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

program
  .command('list')
  .description('List existing cycles')
  .option('-a, --all', 'Show all cycles including past ones')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📋 Fetching cycles...\n'));

      const team = await linear.team(TEAM_ID);
      const cycles = await team.cycles({
        filter: options.all ? {} : {
          endsAt: { gte: new Date() }
        }
      });

      if (cycles.nodes.length === 0) {
        console.log(chalk.yellow('No cycles found'));
        return;
      }

      // Find current cycle
      const now = new Date();
      const currentCycle = cycles.nodes.find(c =>
        new Date(c.startsAt) <= now && new Date(c.endsAt) >= now
      );

      for (const cycle of cycles.nodes) {
        const start = new Date(cycle.startsAt);
        const end = new Date(cycle.endsAt);
        const isCurrent = cycle.id === currentCycle?.id;

        const status = isCurrent
          ? chalk.green(' [CURRENT]')
          : start > now
          ? chalk.blue(' [UPCOMING]')
          : chalk.gray(' [COMPLETED]');

        console.log(`${chalk.bold(cycle.name || `Cycle ${cycle.number}`)}${status}`);
        console.log(`  ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);

        if (cycle.description) {
          console.log(chalk.gray(`  ${cycle.description}`));
        }

        // Get issue count
        const issues = await cycle.issues();
        if (issues.nodes.length > 0) {
          console.log(chalk.cyan(`  Issues: ${issues.nodes.length}`));
        }

        console.log();
      }

    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

program
  .command('current')
  .description('Show current cycle details')
  .action(async () => {
    try {
      console.log(chalk.blue('📅 Current cycle:\n'));

      const team = await linear.team(TEAM_ID);
      const cycles = await team.cycles({
        filter: {
          isPast: { eq: false },
          isFuture: { eq: false }
        }
      });

      const cycle = cycles.nodes[0];

      if (!cycle) {
        console.log(chalk.yellow('No active cycle'));
        return;
      }

      const start = new Date(cycle.startsAt);
      const end = new Date(cycle.endsAt);
      const now = new Date();
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const progress = Math.round((daysElapsed / totalDays) * 100);

      console.log(chalk.green.bold(cycle.name || `Cycle ${cycle.number}`));
      console.log(`${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
      console.log(`Progress: ${progress}% (Day ${daysElapsed} of ${totalDays})`);

      // Progress bar
      const barLength = 30;
      const filled = Math.round(barLength * progress / 100);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      console.log(chalk.cyan(`[${bar}]`));

      // Get issues
      const issues = await cycle.issues();
      if (issues.nodes.length > 0) {
        console.log(`\n📋 Issues (${issues.nodes.length}):`);

        // Group by state
        const byState = {};
        for (const issue of issues.nodes) {
          const state = await issue.state;
          if (!byState[state.name]) byState[state.name] = [];
          byState[state.name].push(issue);
        }

        for (const [stateName, stateIssues] of Object.entries(byState)) {
          console.log(chalk.yellow(`\n  ${stateName} (${stateIssues.length}):`));
          for (const issue of stateIssues) {
            const assignee = await issue.assignee;
            console.log(`    ${chalk.gray(issue.identifier)} ${issue.title}`);
            if (assignee) {
              console.log(chalk.gray(`      👤 ${assignee.name}`));
            }
          }
        }
      }

    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

program
  .command('assign <issueId>')
  .description('Assign an issue to current cycle')
  .action(async (issueId) => {
    try {
      console.log(chalk.blue(`🔄 Assigning ${issueId} to current cycle...\n`));

      // Get current cycle
      const team = await linear.team(TEAM_ID);
      const cycles = await team.cycles({
        filter: {
          isPast: { eq: false },
          isFuture: { eq: false }
        }
      });

      const cycle = cycles.nodes[0];
      if (!cycle) {
        console.log(chalk.red('No active cycle found'));
        return;
      }

      // Find issue
      const searchResults = await linear.searchIssues(issueId);
      const issue = searchResults.nodes.find(i => i.identifier === issueId);

      if (!issue) {
        console.log(chalk.red(`Issue ${issueId} not found`));
        return;
      }

      // Update issue
      await linear.updateIssue(issue.id, {
        cycleId: cycle.id
      });

      console.log(chalk.green(`✅ Assigned ${issueId} to ${cycle.name || `Cycle ${cycle.number}`}`));

    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Helper functions
function getNextMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day; // If Sunday, next day. Otherwise, next Monday
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + diff);
  return nextMonday.toISOString().split('T')[0];
}

function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

program.parse();