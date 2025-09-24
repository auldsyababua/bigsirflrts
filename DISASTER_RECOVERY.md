# 🚨 Disaster Recovery Plan - FLRTS Project

## Current Situation
- Cloned repo from GitHub but lost all gitignored files
- Missing: node_modules, complete .env files, build artifacts
- Have: Partial .env with some values recovered

## Phase 1: Discovery ✅
### Missing Items Identified:
1. **Environment Files**
   - Main .env (partial exists)
   - .env.local, .env.production, .env.development
   - .env.test (for testing)

2. **Dependencies**
   - Root node_modules
   - packages/sync-service/node_modules
   - packages/nlp-service/node_modules
   - monitoring/node_modules
   - infrastructure/digitalocean/monitoring/node_modules

3. **Build Artifacts**
   - dist/, build/, out/ directories
   - Compiled TypeScript files
   - Bundled JavaScript files

## Phase 2: Recovery Steps

### Step 1: Install All Dependencies
```bash
# Install root dependencies
npm install

# Install package dependencies
cd packages/sync-service && npm install && cd ../..
cd packages/nlp-service && npm install && cd ../..
cd monitoring && npm install && cd ..
cd infrastructure/digitalocean/monitoring && npm install && cd ../../..
```

### Step 2: Complete Environment Variables
Add these missing variables to .env:

```env
# Environment variables have been consolidated into main .env file
# All sensitive values should be retrieved from 1Password or regenerated
# Do NOT commit actual API keys to the repository

# Key variables needed:
# - SUPABASE_URL (found: https://[project-ref].supabase.co)
# - SUPABASE_ANON_KEY (retrieve from Supabase dashboard)
# - SUPABASE_SERVICE_ROLE_KEY (retrieve from Supabase dashboard)
# - N8N_WEBHOOK_URL (local or cloud instance)
# - TELEGRAM_BOT_TOKEN (from BotFather)
# - OPENAI_API_KEY (from OpenAI dashboard)
# - And various other service credentials
```

### Step 3: Update Script References
Files that need updating to use main .env:
- [x] `supabase/secrets-sync-telegram.sh` - Updated
- [ ] `supabase/deploy-telegram-webhook.sh` - Pending
- [ ] Any other scripts referencing .env.supabase or .env.telegram

### Step 4: Create Missing Config Files
```bash
# Create test environment file
cp .env .env.test
# Edit .env.test for test-specific values

# Create local development file
cp .env .env.local
# Edit .env.local for local development
```

## Phase 3: Validation

### Service Testing Checklist
- [ ] Supabase connection: `npm run test:supabase`
- [ ] n8n webhooks: Test with curl to webhook endpoints
- [ ] Telegram bot: Send test message
- [ ] OpenProject: Check connection to ops.10nz.tools
- [ ] Build processes: `npm run build`

### Quick Validation Script
```bash
#!/bin/bash
echo "🔍 Validating environment setup..."

# Check if .env exists
if [ -f .env ]; then
    echo "✅ Main .env file exists"
else
    echo "❌ Main .env file missing"
fi

# Check if node_modules installed
if [ -d node_modules ]; then
    echo "✅ Root node_modules installed"
else
    echo "❌ Root node_modules missing - run: npm install"
fi

# Check critical env vars
source .env
required_vars=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "N8N_WEBHOOK_URL"
    "TELEGRAM_BOT_TOKEN"
    "OPENAI_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "_REPLACE_ME_" ]; then
        echo "❌ $var is not set or still placeholder"
    else
        echo "✅ $var is configured"
    fi
done
```

## Recovery Command Sequence

```bash
# 1. First, ensure you're in the project root
cd /Users/colinaulds/Desktop/bigsirflrts

# 2. Install all dependencies
npm install
(cd packages/sync-service && npm install)
(cd packages/nlp-service && npm install)
(cd monitoring && npm install)
(cd infrastructure/digitalocean/monitoring && npm install)

# 3. Build TypeScript projects
npm run build 2>/dev/null || echo "Build script may need configuration"

# 4. Run validation
./validate-setup.sh
```

## Critical Production Info (from CLAUDE.md)
- **OpenProject**: SSH to `root@165.227.216.172`
- **Admin**: admin / mqsgyCQNQ2q*NCMT8QARXKJqz
- **Live URL**: https://ops.10nz.tools

## Next Actions
1. Complete missing environment variables in .env
2. Run dependency installation commands
3. Update remaining script references
4. Test each service connection
5. Verify build processes work