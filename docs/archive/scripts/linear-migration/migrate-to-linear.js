#!/usr/bin/env node

/**
 * Migrate existing project documentation and data to Linear
 * This script analyzes your repository and creates Linear issues from existing docs
 */

import { config } from 'dotenv';
import { LinearClient } from '@linear/sdk';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import chalk from 'chalk';
import { program } from 'commander';

// Load environment variables
config();

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
});

const TEAM_ID = process.env.LINEAR_TEAM_ID;
const PROJECT_ID = process.env.LINEAR_PROJECT_ID;

program
  .name('migrate-to-linear')
  .description('Migrate repository documentation and tasks to Linear')
  .version('1.0.0');

/**
 * Analyze repository structure and suggest Linear issues
 */
program
  .command('analyze')
  .description('Analyze repository and suggest migration items')
  .action(async () => {
    console.log(chalk.blue('🔍 Analyzing repository structure...\n'));

    const migrationItems = [];

    // 1. Scan for TODO comments in code
    console.log(chalk.yellow('Scanning for TODOs in code...'));
    const codeFiles = await glob('**/*.{js,ts,jsx,tsx,py,go,java}', {
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    });

    for (const file of codeFiles) {
      if (fs.statSync(file).isDirectory()) continue;
      const content = fs.readFileSync(file, 'utf8');
      const todoMatches = content.matchAll(/(?:TODO|FIXME|HACK|BUG|XXX):\s*(.+)/gi);

      for (const match of todoMatches) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        migrationItems.push({
          type: 'todo',
          title: match[1].trim(),
          file,
          line: lineNum,
          priority: match[0].startsWith('BUG') ? 2 : 3,
        });
      }
    }

    // 2. Scan documentation files
    console.log(chalk.yellow('Scanning documentation files...'));
    const docFiles = await glob('**/*.{md,mdx}', {
      ignore: ['node_modules/**', '.git/**', 'README.md'],
    });

    for (const file of docFiles) {
      if (fs.statSync(file).isDirectory()) continue;
      const content = fs.readFileSync(file, 'utf8');
      const { data: frontmatter, content: body } = matter(content);

      // Look for specific patterns
      if (file.includes('stories/') || file.includes('tasks/')) {
        migrationItems.push({
          type: 'story',
          title: frontmatter.title || path.basename(file, '.md'),
          description: body.substring(0, 500),
          file,
          labels: frontmatter.tags || [],
          priority: frontmatter.priority || 3,
        });
      }

      // Find task lists in markdown
      const taskListMatches = body.matchAll(/^[-*]\s*\[([ x])\]\s*(.+)/gim);
      for (const match of taskListMatches) {
        if (match[1] === ' ') {
          // Uncompleted tasks
          migrationItems.push({
            type: 'task',
            title: match[2].trim(),
            file,
            completed: false,
          });
        }
      }
    }

    // 3. Scan for GitHub issues references
    console.log(chalk.yellow('Scanning for issue references...'));
    const issueRefs = new Set();
    for (const file of [...codeFiles, ...docFiles]) {
      if (fs.statSync(file).isDirectory()) continue;
      const content = fs.readFileSync(file, 'utf8');
      const issueMatches = content.matchAll(/#(\d+)/g);
      for (const match of issueMatches) {
        issueRefs.add(match[1]);
      }
    }

    // 4. Analyze BMAD structure
    console.log(chalk.yellow('Analyzing BMAD structure...'));
    const bmadPRD = '.bmad-core/prd/*.md';
    const bmadStories = '.bmad-core/stories/*.md';
    const bmadArchitecture = '.bmad-core/architecture/*.md';

    for (const pattern of [bmadPRD, bmadStories, bmadArchitecture]) {
      const files = await glob(pattern);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const { data: frontmatter, content: body } = matter(content);

        migrationItems.push({
          type: file.includes('prd') ? 'epic' : file.includes('stories') ? 'story' : 'task',
          title: frontmatter.title || path.basename(file, '.md'),
          description: body,
          file,
          labels: [path.dirname(file).split('/').pop()],
          estimate: frontmatter.estimate,
        });
      }
    }

    // 5. Check for existing project management files
    const projectFiles = [
      'ROADMAP.md',
      'TODO.md',
      'BACKLOG.md',
      'CONTRIBUTING.md',
      'docs/tasks.md',
      'docs/features.md',
    ];

    for (const file of projectFiles) {
      if (fs.existsSync(file)) {
        console.log(chalk.green(`  Found: ${file}`));
        const content = fs.readFileSync(file, 'utf8');

        // Extract sections as potential epics
        const sections = content.match(/^##\s+(.+)/gm);
        if (sections) {
          for (const section of sections) {
            const title = section.replace(/^##\s+/, '');
            migrationItems.push({
              type: 'epic',
              title: title,
              file,
              description: `Migrated from ${file}`,
            });
          }
        }
      }
    }

    // Display summary
    console.log(chalk.blue('\n📊 Migration Summary:\n'));

    const summary = migrationItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    for (const [type, count] of Object.entries(summary)) {
      console.log(chalk.green(`  ${type}: ${count} items`));
    }

    console.log(chalk.blue('\nTop Priority Items:\n'));
    const priorityItems = migrationItems
      .filter((item) => item.priority && item.priority <= 2)
      .slice(0, 10);

    for (const item of priorityItems) {
      console.log(`  P${item.priority}: ${item.title}`);
      console.log(chalk.gray(`    ${item.file}`));
    }

    // Save analysis
    const outputFile = 'linear-migration-analysis.json';
    fs.writeFileSync(outputFile, JSON.stringify(migrationItems, null, 2));
    console.log(chalk.green(`\n✅ Analysis saved to ${outputFile}`));
    console.log(chalk.yellow('Run "migrate-to-linear import" to create Linear issues'));

    return migrationItems;
  });

/**
 * Import analyzed items to Linear
 */
program
  .command('import')
  .description('Import analyzed items to Linear')
  .option('-f, --file <path>', 'Analysis file', 'linear-migration-analysis.json')
  .option('-d, --dry-run', 'Preview without creating issues')
  .action(async (options) => {
    if (!fs.existsSync(options.file)) {
      console.error(chalk.red(`Analysis file not found: ${options.file}`));
      console.log(chalk.yellow('Run "migrate-to-linear analyze" first'));
      return;
    }

    const items = JSON.parse(fs.readFileSync(options.file, 'utf8'));
    console.log(chalk.blue(`📥 Importing ${items.length} items to Linear...\n`));

    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN - No issues will be created\n'));
    }

    // Get team states
    const team = await linear.team(TEAM_ID);
    const states = await team.states();
    const backlogState = states.nodes.find((s) => s.name === 'Backlog');
    const todoState = states.nodes.find((s) => s.name === 'Todo');

    // Group items by type
    const epics = items.filter((i) => i.type === 'epic');
    const stories = items.filter((i) => i.type === 'story');
    const tasks = items.filter((i) => i.type === 'task' || i.type === 'todo');

    // Create parent issues first (epics)
    const epicMap = {};
    for (const epic of epics) {
      console.log(chalk.blue(`Creating epic: ${epic.title}`));

      if (!options.dryRun) {
        const issue = await linear.createIssue({
          teamId: TEAM_ID,
          projectId: PROJECT_ID,
          title: `[EPIC] ${epic.title}`,
          description: epic.description || `Migrated from ${epic.file}`,
          priority: epic.priority || 3,
          stateId: backlogState.id,
        });

        epicMap[epic.title] = issue.issue.id;
        console.log(chalk.green(`  ✅ Created ${issue.issue.identifier}`));
      } else {
        console.log(chalk.gray(`  Would create epic: ${epic.title}`));
      }
    }

    // Create stories
    for (const story of stories) {
      console.log(chalk.cyan(`Creating story: ${story.title}`));

      // Find parent epic if applicable
      const parentEpic = Object.keys(epicMap).find((epicTitle) =>
        story.file?.includes(epicTitle.toLowerCase().replace(/\s+/g, '-'))
      );

      if (!options.dryRun) {
        const issue = await linear.createIssue({
          teamId: TEAM_ID,
          projectId: PROJECT_ID,
          title: story.title,
          description: story.description || `Migrated from ${story.file}`,
          priority: story.priority || 3,
          stateId: backlogState.id,
          parentId: parentEpic ? epicMap[parentEpic] : undefined,
          estimate: story.estimate,
        });

        console.log(chalk.green(`  ✅ Created ${issue.issue.identifier}`));
      } else {
        console.log(chalk.gray(`  Would create story: ${story.title}`));
      }
    }

    // Create tasks in batches
    console.log(chalk.yellow(`\nCreating ${tasks.length} tasks...`));
    const BATCH_SIZE = 10;

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);

      if (!options.dryRun) {
        const promises = batch.map((task) =>
          linear.createIssue({
            teamId: TEAM_ID,
            projectId: PROJECT_ID,
            title: task.title,
            description: `From ${task.file}${task.line ? `:${task.line}` : ''}`,
            priority: task.priority || 4,
            stateId: todoState.id,
          })
        );

        await Promise.all(promises);
        console.log(chalk.green(`  ✅ Created batch ${i / BATCH_SIZE + 1}`));
      } else {
        console.log(chalk.gray(`  Would create batch of ${batch.length} tasks`));
      }
    }

    if (!options.dryRun) {
      console.log(chalk.green('\n✅ Import complete!'));
      console.log(chalk.blue('View in Linear: https://linear.app/10netzero/project/bigsirflrts'));
    }
  });

/**
 * Create Linear structure from BMAD configuration
 */
program
  .command('setup-bmad')
  .description('Create Linear structure matching BMAD methodology')
  .action(async () => {
    console.log(chalk.blue('🏗️  Setting up BMAD structure in Linear...\n'));

    // Read BMAD configuration
    const bmadConfig = '.bmad-core/core-config.yaml';
    if (!fs.existsSync(bmadConfig)) {
      console.error(chalk.red('BMAD configuration not found'));
      return;
    }

    // Create labels for BMAD agents
    const agentLabels = [
      { name: 'bmad:pm', color: '#4B5563', description: 'PM Agent work' },
      { name: 'bmad:architect', color: '#7C3AED', description: 'Architect Agent work' },
      { name: 'bmad:dev', color: '#2563EB', description: 'Dev Agent work' },
      { name: 'bmad:qa', color: '#10B981', description: 'QA Agent work' },
      { name: 'needs-prd', color: '#F59E0B', description: 'Requires PRD generation' },
      { name: 'needs-architecture', color: '#8B5CF6', description: 'Requires architecture design' },
      { name: 'needs-tests', color: '#EF4444', description: 'Requires test coverage' },
    ];

    console.log(chalk.yellow('Creating BMAD labels...'));
    for (const label of agentLabels) {
      try {
        await linear.createIssueLabel({
          teamId: TEAM_ID,
          ...label,
        });
        console.log(chalk.green(`  ✅ Created label: ${label.name}`));
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(chalk.gray(`  Label exists: ${label.name}`));
        } else {
          console.error(chalk.red(`  Failed: ${error.message}`));
        }
      }
    }

    // Create workflow template issues
    console.log(chalk.yellow('\nCreating workflow templates...'));

    const templates = [
      {
        title: '[Template] BMAD Feature Development',
        description: `## BMAD Feature Workflow

This template demonstrates the BMAD development flow:

1. **PM Agent** generates PRD
2. **Architect Agent** creates technical design
3. **Dev Agent** implements solution
4. **QA Agent** validates and tests

### Checklist:
- [ ] PRD approved
- [ ] Architecture reviewed
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated`,
        labels: ['template'],
      },
      {
        title: '[Template] Sprint Planning',
        description: `## Sprint Planning Template

### Sprint Goals:
- [ ] Define sprint objectives
- [ ] Review backlog
- [ ] Estimate stories
- [ ] Assign work

### Capacity Planning:
- Available developers:
- Sprint duration:
- Focus areas:`,
        labels: ['template', 'planning'],
      },
    ];

    for (const template of templates) {
      await linear.createIssue({
        teamId: TEAM_ID,
        projectId: PROJECT_ID,
        ...template,
        priority: 0, // No priority for templates
      });
      console.log(chalk.green(`  ✅ Created template: ${template.title}`));
    }

    console.log(chalk.green('\n✅ BMAD structure created in Linear!'));
  });

program.parse();
