#!/usr/bin/env node

/**
 * Push Documentation to Linear
 * Creates Linear documents from markdown files before archiving
 */

const { LinearClient } = require('@linear/sdk');
const fs = require('fs').promises;
const path = require('path');

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY
});

const PROJECT_ID = process.env.LINEAR_PROJECT_ID || '9d089be4-a284-4879-9b67-f472abecf998';

async function pushDocsToLinear() {
  console.log('📤 Pushing documentation to Linear...\n');

  const docDirs = [
    { path: 'docs/stories', label: 'story' },
    { path: 'docs/qa', label: 'qa' },
    { path: 'docs/misc', label: 'documentation' },
    { path: 'docs/processes', label: 'process' }
  ];

  let created = 0;
  let errors = [];

  for (const dir of docDirs) {
    try {
      const dirExists = await fs.access(dir.path).then(() => true).catch(() => false);
      if (!dirExists) continue;

      const files = await getMarkdownFiles(dir.path);

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const title = extractTitle(content, file);

          // Extract metadata
          const metadata = extractMetadata(content);

          // Create document in Linear
          const doc = await linear.createDocument({
            title: title,
            content: content,
            projectId: PROJECT_ID,
            metadata: {
              sourcePath: file,
              importDate: new Date().toISOString(),
              type: dir.label,
              ...metadata
            }
          });

          console.log(`✅ Created: ${title} (${doc.id})`);
          created++;

          // Add to migration log
          await logMigration(file, doc.id, title);

        } catch (err) {
          console.error(`❌ Error with ${file}: ${err.message}`);
          errors.push({ file, error: err.message });
        }
      }
    } catch (err) {
      console.error(`❌ Error processing ${dir.path}: ${err.message}`);
      errors.push({ dir: dir.path, error: err.message });
    }
  }

  // Create migration summary
  await createMigrationSummary(created, errors);

  console.log(`\n📊 Migration complete: ${created} documents created`);
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} errors occurred`);
  }

  return { created, errors };
}

async function getMarkdownFiles(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTitle(content, filepath) {
  // Try to extract title from first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];

  // Try to extract from frontmatter
  const titleMatch = content.match(/^title:\s*["']?(.+?)["']?$/m);
  if (titleMatch) return titleMatch[1];

  // Use filename as fallback
  return path.basename(filepath, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function extractMetadata(content) {
  const metadata = {};

  // Extract story/epic IDs
  const storyMatch = content.match(/Story ID:\s*(.+)/i);
  if (storyMatch) metadata.storyId = storyMatch[1];

  const epicMatch = content.match(/Epic:\s*(.+)/i);
  if (epicMatch) metadata.epicId = epicMatch[1];

  // Extract QA gate status
  const gateMatch = content.match(/gate:\s*(PASS|FAIL|PENDING)/i);
  if (gateMatch) metadata.qaGate = gateMatch[1];

  // Extract dates
  const dateMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) metadata.date = dateMatch[1];

  return metadata;
}

async function logMigration(filepath, linearId, title) {
  const logPath = 'linear-migration.log';
  let log = [];

  try {
    const existing = await fs.readFile(logPath, 'utf-8');
    log = JSON.parse(existing);
  } catch (err) {
    // Log doesn't exist yet
  }

  log.push({
    timestamp: new Date().toISOString(),
    filepath,
    linearId,
    title
  });

  await fs.writeFile(logPath, JSON.stringify(log, null, 2));
}

async function createMigrationSummary(created, errors) {
  const summary = `# Linear Documentation Migration Summary

Date: ${new Date().toISOString()}

## Results
- Documents created: ${created}
- Errors: ${errors.length}

## Errors
${errors.map(e => `- ${e.file || e.dir}: ${e.error}`).join('\n')}

## Next Steps
1. Run \`node scripts/archive-docs.js\` to archive local files
2. Update BMAD agents to use Linear MCP tools
3. Verify all documents are accessible in Linear

## Access Documents

### Via Linear Web:
https://linear.app/10netzero/project/${PROJECT_ID}/documents

### Via Linear CLI:
\`\`\`bash
node scripts/linear-cli.js list --type documents
\`\`\`

### Via Linear MCP Tools:
\`\`\`javascript
await linearClient.listDocuments({
  projectId: '${PROJECT_ID}'
});
\`\`\`
`;

  await fs.writeFile('LINEAR-MIGRATION-SUMMARY.md', summary);
  console.log('📝 Created migration summary: LINEAR-MIGRATION-SUMMARY.md');
}

// Run if executed directly
if (require.main === module) {
  if (!process.env.LINEAR_API_KEY) {
    console.error('❌ LINEAR_API_KEY environment variable is required');
    console.log('Run: source scripts/setup-linear.js');
    process.exit(1);
  }

  pushDocsToLinear()
    .then(result => {
      console.log('\n✅ Push to Linear complete!');
      if (result.errors.length === 0) {
        console.log('\n📦 You can now archive local files:');
        console.log('   node scripts/archive-docs.js');
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Push failed:', err);
      process.exit(1);
    });
}

module.exports = { pushDocsToLinear };