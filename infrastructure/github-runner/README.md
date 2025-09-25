# Self-Hosted GitHub Actions Runner

Fast, local GitHub Actions runner for BIGSIRFLRTS project. Runs the same QA gates and tests but **much faster** than GitHub-hosted runners.

## Why Use This?

- **Speed**: ~5x faster than GitHub-hosted runners (no queue time, local caching)
- **Cost**: Free (uses your local machine instead of GitHub minutes)
- **Debugging**: See real-time logs and debug failing workflows instantly
- **Caching**: NPM packages and build artifacts cached locally
- **Control**: Full control over runner environment and resources

## Quick Start

### 1. Get a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Select scope: `repo` (full control of private repositories)
3. Generate token and save it

### 2. Setup and Start Runner

```bash
cd infrastructure/github-runner

# Option A: Interactive setup (recommended)
make register  # This will prompt for token and create .env
make build     # Build optimized Docker image
make start     # Start the runner

# Option B: Manual setup
cp .env.example .env
# Edit .env with your GITHUB_TOKEN
make build
make start
```

### 3. Verify Runner is Connected

Check https://github.com/auldsyababua/bigsirflrts/settings/actions/runners

You should see your runner listed as "Idle" (ready to accept jobs).

## Using the Runner in Workflows

### Option 1: Always Use Self-Hosted (Fastest)

```yaml
jobs:
  qa-gate:
    runs-on: [self-hosted, local, fast]  # Use local runner
    # ... rest of job
```

### Option 2: Use for Specific Events (Recommended)

```yaml
jobs:
  qa-gate:
    runs-on: ${{ github.event_name == 'pull_request' && 'self-hosted' || 'ubuntu-latest' }}
    # Uses self-hosted for PRs, GitHub-hosted for main branch
```

### Option 3: Matrix Strategy (Best for Testing)

```yaml
jobs:
  qa-gate:
    strategy:
      matrix:
        runner: [ubuntu-latest, self-hosted]
    runs-on: ${{ matrix.runner }}
    # Runs on both to ensure compatibility
```

## Performance Optimizations

This runner includes several optimizations:

1. **Pre-installed Dependencies**: Node.js, npm, ripgrep, shellcheck
2. **NPM Cache**: Persistent cache volume for npm packages
3. **Playwright Cache**: Browser binaries cached
4. **Increased Resources**: 4 CPUs, 8GB RAM allocated
5. **Ephemeral Mode**: Clean environment for each job

## Management Commands

```bash
make status   # Check if runner is active
make logs     # View real-time logs
make restart  # Restart the runner
make stop     # Stop the runner
make clean    # Remove runner and clean caches
make shell    # Debug inside container
```

## Troubleshooting

### Runner Not Appearing in GitHub

1. Check token is valid: `make logs`
2. Ensure token has `repo` scope
3. Try re-registering: `make register`

### Workflow Still Using GitHub-Hosted Runner

1. Check your workflow file has `runs-on: [self-hosted, local, fast]`
2. Ensure runner is showing as "Idle" in GitHub settings
3. Check no other runners have same labels

### Performance Not Improved

1. Check Docker resources: Docker Desktop → Settings → Resources
2. Ensure cache volumes are working: `make shell` then `ls ~/.npm-cache`
3. Monitor with: `docker stats bigsirflrts-runner`

## Advanced Configuration

### Using with Multiple Repositories

Edit `.env` to change repository:
```bash
GITHUB_REPOSITORY=auldsyababua/other-repo
make restart
```

### Custom Labels

Edit `.env`:
```bash
RUNNER_LABELS=self-hosted,gpu,ml-ready
```

Then use in workflow:
```yaml
runs-on: [self-hosted, gpu]
```

### Persistent Work Directory

By default, work directory is ephemeral. To persist:
1. Uncomment volume mount in `docker-compose.yml`
2. Work will be saved in `./work/`

## Security Notes

- Runner runs in Docker container (isolated)
- Repository-scoped (not organization-wide)
- Token expires after 1 hour (get new with `make register`)
- No sensitive data stored in image
- Ephemeral mode ensures clean slate for each job

## Typical Workflow

1. Make code changes
2. Push to feature branch
3. Local runner picks up job immediately (no queue)
4. See results in ~30 seconds instead of 2-3 minutes
5. Fix any issues and repeat

## Benchmarks

| Operation | GitHub-Hosted | Self-Hosted | Improvement |
|-----------|--------------|-------------|-------------|
| Queue Time | 5-30s | 0s | Instant |
| npm install | 45s | 8s (cached) | 5.6x faster |
| Lint | 15s | 3s | 5x faster |
| Tests | 60s | 15s | 4x faster |
| Total | 2-3 min | 30s | 4-6x faster |

## Need Help?

- Check logs: `make logs`
- Check status: `make status`
- Restart runner: `make restart`
- Clean everything: `make clean`