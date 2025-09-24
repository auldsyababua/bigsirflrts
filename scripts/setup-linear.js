#!/usr/bin/env node

/**
 * Linear Setup Script
 * Configures Linear API integration for BigSirFLRTS project
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

console.log('🔧 Linear Integration Setup for BigSirFLRTS\n');
console.log('This script will help you configure your Linear API integration.\n');

async function setup() {
  // Check if .env exists
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ Found existing .env file\n');
  } else {
    console.log('📝 Creating new .env file\n');
  }

  // Check for existing Linear config
  if (envContent.includes('LINEAR_API_KEY')) {
    console.log('⚠️  LINEAR_API_KEY already exists in .env');
    const overwrite = await question('Do you want to update it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Keeping existing configuration.');
      rl.close();
      return;
    }
    // Remove old LINEAR_* variables
    envContent = envContent
      .split('\n')
      .filter((line) => !line.startsWith('LINEAR_'))
      .join('\n');
  }

  console.log('\n📋 To get your Linear API key:');
  console.log('1. Go to https://linear.app/settings/api');
  console.log('2. Click "Create new API key"');
  console.log('3. Name it "BigSirFLRTS Integration"');
  console.log('4. Copy the generated key\n');

  const apiKey = await question('Enter your Linear API key: ');

  if (!apiKey || !apiKey.startsWith('lin_api_')) {
    console.error('❌ Invalid API key format. Linear API keys start with "lin_api_"');
    rl.close();
    process.exit(1);
  }

  // Add Linear configuration
  const linearConfig = `
# Linear Integration
LINEAR_API_KEY=${apiKey}
LINEAR_TEAM_ID=YOUR_LINEAR_PROJECT_ID
LINEAR_PROJECT_ID=9d089be4-a284-4879-9b67-f472abecf998
`;

  // Append to .env
  envContent = envContent.trim() + '\n' + linearConfig;
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Linear configuration added to .env');
  console.log('   Team: 10netzero');
  console.log('   Project: BigSirFLRTS');

  // Test the connection
  console.log('\n🧪 Testing Linear connection...');

  try {
    // Set the environment variable for this process
    process.env.LINEAR_API_KEY = apiKey;

    const { getLinearClient } = await import('../lib/linear-integration.js');
    const linear = getLinearClient();

    const user = await linear.getCurrentUser();
    console.log(`✅ Connected as: ${user.name} (${user.email})`);

    const project = await linear.getProject();
    console.log(`✅ Project found: ${project.name}`);

    console.log('\n🎉 Linear integration successfully configured!');
    console.log('\nYou can now use:');
    console.log('  node scripts/linear-cli.js list       # List issues');
    console.log('  node scripts/linear-cli.js create     # Create issue');
    console.log('  node scripts/linear-cli.js cycle      # View current cycle');
  } catch (error) {
    console.error('❌ Failed to connect to Linear:', error.message);
    console.error('Please check your API key and try again.');
  }

  rl.close();
}

setup().catch((error) => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});
