FLRTS stands for 'Field Reports, Lists, Reminders, Tasks, and Sub-Tasks.'

## Important Production Services

### OpenProject (Live at https://ops.10nz.tools)
- **SSH Access**: `ssh do-openproject` or `ssh root@165.227.216.172`
- **Admin Login**: admin / mqsgyCQNQ2q*NCMT8QARXKJqz
- **Docker Config**: `/root/docker-compose.yml` on droplet
- **Database**: Supabase PostgreSQL (project: thnwlykidzhrsagyjncc)
- **File Storage**: Cloudflare R2 (bucket: 10netzero-docs)
- **Known Issue**: Data currently in `public` schema instead of `openproject` schema

## NEVER READ THESE FILES:

- package-lock.json (45k tokens!)

## Search Performance

- Use ripgrep (rg) not grep
- Check .rgignore if searches are slow
- Archives live in ~/Desktop/flrts-archives

## CRITICAL: Search Commands That Preserve Context

### ❌ NEVER DO THIS:

```bash
grep -r "pattern" .                    # Searches EVERYTHING including archives
find . -name "*.js"                    # Includes all node_modules
ls -R                                   # Lists entire tree
```

### ✅ ALWAYS DO THIS:

#### For Code Searches:

```bash
# Use ripgrep with exclusions
rg "pattern" --type js --type ts -g '!node_modules' -g '!archive' -g '!*.min.js'

# Or grep with exclusions
grep -r "pattern" . \
  --exclude-dir=node_modules \
  --exclude-dir=archive \
  --exclude-dir=.git \
  --exclude="*.min.js"
```

#### For File Finding:

```bash
# Find with exclusions
find . -name "*.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/archive/*" \
  -not -path "*/.git/*"

# Or use fd (if available)
fd "\.ts$" --exclude node_modules --exclude archive
```

#### For Directory Listing:

```bash
# List only relevant directories
ls -la --ignore=node_modules --ignore=archive

# Tree with depth limit
tree -L 2 -I 'node_modules|archive|*.git'
```

## Project Structure Reference

### Active Code Locations:

- `/infrastructure` - Docker, scripts, tests
- `/database` - Schema and migrations
- `/tests` - Test files (not archives)
- `/packages` - Active packages (check if node_modules needed)

### Ignore These Completely:

- `/ARCHIVE(DEPRECATED)` - Old UI code
- `/docs/archive` - Old documentation
- `/.bmad-core` - Template system (rarely needed)
- Any `node_modules` directories
- Binary files in `/tools`

## Context-Saving Tips:

1. **Use specific paths when possible:**

   ```bash
   grep "pattern" ./infrastructure/*.sh  # Search only shell scripts
   ```

2. **Limit search depth:**

   ```bash
   find . -maxdepth 2 -name "*.config.js"
   ```

3. **Use file type filters:**

   ```bash
   rg "TODO" --type ts --type js  # Only TypeScript and JavaScript
   ```

4. **Check file size before reading:**
   ```bash
   ls -lh file.md  # Check size first
   head -20 file.md  # Read only first 20 lines if large
   ```

## Quick Reference:

| Task                    | Command                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| Find TypeScript files   | `fd "\.ts$" -E node_modules -E archive`                               |
| Search code for pattern | `rg "pattern" -t ts -t js -g '!node_modules'`                         |
| List project structure  | `tree -L 2 -I 'node_modules\|archive'`                                |
| Check recent changes    | `git status --short`                                                  |
| Find config files       | `find . -maxdepth 3 -name "*.config.*" -not -path "*/node_modules/*"` |
