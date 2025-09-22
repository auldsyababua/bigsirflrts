#!/usr/bin/env node

/**
 * Simplified migration analyzer for BigSirFLRTS to Linear
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

config();

console.log(chalk.blue('🔍 Analyzing BigSirFLRTS project for Linear migration...\n'));

const migrationItems = [];

// 1. Check key documentation files
console.log(chalk.yellow('📄 Checking documentation files...'));

const keyDocs = [
  { file: 'docs/stories/1.1.deploy-openproject-docker-digitalocean.md', type: 'story', priority: 1 },
  { file: 'docs/qa/gates/1.1-deploy-openproject-docker-digitalocean-REVIEW-2025-09-19.yml', type: 'qa', priority: 2 },
  { file: 'OPENPROJECT_DEPLOYMENT.md', type: 'epic', priority: 1 },
  { file: 'docs/system-connections.md', type: 'architecture', priority: 2 },
  { file: 'docs/linear-integration.md', type: 'documentation', priority: 3 },
  { file: 'CONTRIBUTING.md', type: 'documentation', priority: 3 },
];

for (const doc of keyDocs) {
  if (fs.existsSync(doc.file)) {
    const content = fs.readFileSync(doc.file, 'utf8');
    const lines = content.split('\n');
    const title = lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || path.basename(doc.file);

    migrationItems.push({
      type: doc.type,
      title: title.substring(0, 100),
      file: doc.file,
      priority: doc.priority,
      description: lines.slice(0, 10).join('\n')
    });

    console.log(chalk.green(`  ✓ ${doc.file}`));
  }
}

// 2. Check BMAD structure
console.log(chalk.yellow('\n📁 Checking BMAD structure...'));

const bmadDirs = [
  '.bmad-core/prd',
  '.bmad-core/stories',
  '.bmad-core/architecture',
  '.bmad-core/agents'
];

for (const dir of bmadDirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    console.log(chalk.green(`  ✓ ${dir}: ${files.length} files`));

    for (const file of files.slice(0, 5)) { // Limit to first 5
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const title = content.split('\n')[0].replace(/^#+\s*/, '') || file;

      migrationItems.push({
        type: dir.includes('prd') ? 'epic' : dir.includes('stories') ? 'story' : 'task',
        title: title.substring(0, 100),
        file: path.join(dir, file),
        priority: 3,
        labels: [dir.split('/').pop()]
      });
    }
  }
}

// 3. Quick TODO scan (limited)
console.log(chalk.yellow('\n🔍 Quick TODO scan...'));

const quickScanFiles = [
  'scripts/linear-webhook.js',
  'lib/linear-integration.js',
  'infrastructure/scripts/deploy-openproject.sh'
];

let todoCount = 0;
for (const file of quickScanFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const todos = content.match(/TODO:/gi);
    if (todos) {
      todoCount += todos.length;
      console.log(chalk.gray(`  ${file}: ${todos.length} TODOs`));
    }
  }
}

// 4. Current work in progress
console.log(chalk.yellow('\n🚧 Current work items...'));

// Check git status for current changes
const currentWork = [
  { title: 'Linear integration setup', type: 'epic', priority: 1, status: 'in-progress' },
  { title: 'OpenProject deployment on DigitalOcean', type: 'story', priority: 1, status: 'completed' },
  { title: 'Supabase PostgreSQL migration', type: 'task', priority: 2, status: 'completed' },
  { title: 'Cloudflare R2 storage configuration', type: 'task', priority: 2, status: 'completed' },
];

currentWork.forEach(work => {
  migrationItems.push(work);
  console.log(chalk.green(`  ✓ ${work.title} (${work.status})`));
});

// Summary
console.log(chalk.blue('\n📊 Migration Summary:\n'));

const summary = migrationItems.reduce((acc, item) => {
  acc[item.type] = (acc[item.type] || 0) + 1;
  return acc;
}, {});

for (const [type, count] of Object.entries(summary)) {
  console.log(chalk.green(`  ${type}: ${count} items`));
}

console.log(chalk.blue('\n🎯 Recommended Linear Structure:\n'));

console.log('1. Create these epics:');
console.log('   - OpenProject Deployment & Configuration');
console.log('   - Linear Integration & BMAD Workflow');
console.log('   - Infrastructure & DevOps');
console.log('   - Documentation & Knowledge Base');

console.log('\n2. Import stories from:');
console.log('   - docs/stories/*.md files');
console.log('   - .bmad-core/stories/*.md files');

console.log('\n3. Create labels:');
console.log('   - infrastructure, integration, documentation');
console.log('   - bmad:pm, bmad:architect, bmad:dev, bmad:qa');
console.log('   - needs-prd, needs-architecture, needs-tests');

console.log('\n4. Set up cycles:');
console.log('   - 2-week sprints');
console.log('   - Start with current work items');

// Save summary
const outputFile = 'linear-migration-summary.json';
fs.writeFileSync(outputFile, JSON.stringify({
  summary,
  items: migrationItems,
  recommendations: {
    epics: ['OpenProject Deployment', 'Linear Integration', 'Infrastructure', 'Documentation'],
    labels: ['infrastructure', 'integration', 'documentation', 'bmad:pm', 'bmad:architect'],
    currentPriorities: migrationItems.filter(i => i.priority === 1).map(i => i.title)
  }
}, null, 2));

console.log(chalk.green(`\n✅ Analysis complete! Summary saved to ${outputFile}`));
console.log(chalk.yellow('\nNext steps:'));
console.log('1. Run: node scripts/migrate-to-linear.js setup-bmad');
console.log('2. Run: node scripts/setup-linear-cycles.js create');
console.log('3. Manually create the recommended epics in Linear');
console.log('4. Import specific items as needed');