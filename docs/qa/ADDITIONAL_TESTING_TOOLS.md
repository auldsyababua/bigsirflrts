# Additional Linting and Validation Tools

This document outlines all the code quality, linting, and validation tools
available in the BIGSIRFLRTS project.

## Code Quality Tools

### 1. Dependency Checker (depcheck)

- **Purpose**: Finds unused dependencies, missing dependencies, and phantom
  dependencies in package.json
- **Installation**: Already added to devDependencies
- **Run Command**: `npm run lint:deps`
- **Script Added**: `"lint:deps": "depcheck"`
- **What it catches**:
  - Unused packages that can be removed
  - Missing packages that are imported but not in package.json
  - Phantom dependencies (in package.json but never used)

## Infrastructure Validators

### 1. Docker Configuration Validator

- **Purpose**: Validates Docker setup and catches missing Dockerfiles,
  out-of-sync package-lock files
- **Location**: scripts/validate-docker-config.sh
- **Run Command**: `bash scripts/validate-docker-config.sh`
- **What it checks**:
  - ✅ Each service in docker-compose.yml has a Dockerfile
  - ✅ Package-lock.json files are in sync with package.json
  - ✅ Build contexts are properly configured
  - ✅ Prevents "Missing Dockerfile" errors before Docker build

### 2. Environment Variable Validator

- **Purpose**: Validates .env files for common issues
- **Location**: scripts/validate-env.sh
- **Run Command**: `bash scripts/validate-env.sh`
- **What it checks**:
  - ✅ No duplicate variable names
  - ✅ No empty values for critical variables
  - ✅ Required variables are present (customizable)
  - ✅ Proper format (KEY=value)

### 3. Test Environment Validator

- **Purpose**: Validates test environment matches CI requirements
- **Location**: scripts/validate-test-env.sh
- **Run Command**: `bash scripts/validate-test-env.sh`
- **What it checks**:
  - ✅ Environment variables match CI settings
  - ✅ Shows which tests will run vs be skipped
  - ✅ Validates test configuration consistency

## Existing Linting Tools

### 1. JavaScript/TypeScript Linting (ESLint)

- **Purpose**: Enforces code style and catches potential bugs
- **Run Command**: `npm run lint:js`
- **Configuration**: .eslintrc.json
- **Auto-fix**: `npm run lint:fix`

### 2. Markdown Linting (markdownlint)

- **Purpose**: Ensures consistent markdown formatting
- **Run Command**: `npm run lint:md`
- **Configuration**: .markdownlint.json
- **Auto-fix**: `npm run lint:fix`

### 3. Shell Script Linting (shellcheck)

- **Purpose**: Catches common shell scripting errors
- **Run Command**: `npm run lint:shell`
- **Note**: Requires shellcheck to be installed

## How to Run All Validation Tools

### Individual Commands:

```bash
# JavaScript/TypeScript linting
npm run lint:js

# Markdown linting
npm run lint:md

# Shell script linting
npm run lint:shell

# Dependency checking
npm run lint:deps

# Docker validation
bash scripts/validate-docker-config.sh

# Environment validation
bash scripts/validate-env.sh

# Test environment validation
bash scripts/validate-test-env.sh
```

### All at once:

```bash
npm run lint  # Runs lint:js, lint:md, and lint:shell
```

## Integration with CI/QA Gate

These tools help prevent:

- 🚫 Docker build failures from missing Dockerfiles
- 🚫 npm ci errors from out-of-sync package-lock.json
- 🚫 Runtime errors from missing dependencies
- 🚫 Environment configuration issues
- 🚫 Bloated node_modules from unused packages

## Example Output

### Dependency Check:

```
Unused dependencies
* @types/cors
* axios
Missing dependencies
* express: ./src/server.ts
```

### Docker Validator:

```
✅ All services have Dockerfiles
✅ package-lock.json files are in sync
✅ Docker configuration is valid
```

### Environment Validator:

```
✅ No duplicate keys found
⚠️  Empty value for: DATABASE_URL
✅ Required variables present
```

### Test Environment Validator:

```
Environment Configuration:
  CI=true ✓
  NODE_ENV=test ✓
  ENABLE_E2E_TESTS=false ✓
E2E tests will be SKIPPED in this configuration
```

## Summary

These tools catch configuration issues early, before they cause failures in
Docker builds or CI pipelines. Run them regularly during development to maintain
code quality and prevent deployment issues.

### When to Use Each Tool

- **Before committing**: Run `npm run lint` and `npm run lint:deps`
- **Before Docker builds**: Run `bash scripts/validate-docker-config.sh`
- **After changing .env files**: Run `bash scripts/validate-env.sh`
- **Before running tests locally**: Run `bash scripts/validate-test-env.sh`
- **In CI/CD pipelines**: All tools should be integrated into your QA gate

### Quick Validation Script

Create a single validation script to run all checks:

```bash
#!/bin/bash
# Run all validation tools

echo "Running all validation checks..."

npm run lint
npm run lint:deps
bash scripts/validate-docker-config.sh
bash scripts/validate-env.sh
bash scripts/validate-test-env.sh

echo "All validation checks complete!"
```

Save this as `scripts/validate-all.sh` and run with
`bash scripts/validate-all.sh` for comprehensive validation.
