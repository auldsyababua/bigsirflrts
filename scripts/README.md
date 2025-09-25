# Utility Scripts Directory

This directory contains general-purpose utility scripts and tools that are not specific to infrastructure operations.

## Directory Structure

```
/scripts/
├── README.md                    # This file
├── cf-wrangler                  # Cloudflare Workers deployment
├── check-cf-dns                 # DNS verification for Cloudflare
├── bmad-qa-gate.sh             # BMAD QA gate automation
├── linear-*.js                  # Linear.app integration tools
├── migrate-to-linear*.js        # Linear migration utilities
├── push-docs-to-linear.js      # Documentation sync to Linear
├── setup-linear-cycles.js      # Linear cycle management
├── maintenance/                 # Maintenance and cleanup scripts
└── setup/                      # Project setup utilities
```

## Script Categories

### Cloudflare Utilities
- **cf-wrangler**: Deploy and manage Cloudflare Workers
- **check-cf-dns**: Verify DNS configuration for Cloudflare domains

### Linear.app Integration
- **linear-cli.js**: Command-line interface for Linear operations
- **linear-webhook.js**: Webhook handler for Linear events
- **migrate-to-linear.js**: Full migration from other project management tools
- **migrate-to-linear-simple.js**: Simplified migration script
- **push-docs-to-linear.js**: Push documentation to Linear
- **setup-linear-cycles.js**: Configure Linear cycles and sprints

### BMAD Method
- **bmad-qa-gate.sh**: Automated quality gate validation for BMAD stories

### Maintenance
- **maintenance/**: Contains cleanup and maintenance utilities
  - Database cleanup scripts
  - Log rotation utilities
  - Temporary file cleanup

### Setup
- **setup/**: Initial project setup scripts
  - Environment configuration
  - Dependency installation helpers

## Usage Guidelines

1. **General Utilities Only**: This directory is for general-purpose scripts. Infrastructure-specific scripts belong in `/infrastructure/scripts/`

2. **Executable Permissions**: Ensure scripts have proper executable permissions:
   ```bash
   chmod +x scripts/your-script.sh
   ```

3. **Documentation**: Each script should include:
   - Purpose description in header comments
   - Usage examples
   - Required environment variables
   - Dependencies

4. **Naming Convention**:
   - Shell scripts: `kebab-case.sh`
   - JavaScript: `kebab-case.js`
   - Python: `snake_case.py`

## Infrastructure Scripts

For infrastructure-specific operations, see `/infrastructure/scripts/`:
- Deployment scripts
- Health checks
- Resilience testing
- Environment generation
- Monitoring deployment

## Contributing

When adding new scripts:
1. Determine if it's a utility (here) or infrastructure script (`/infrastructure/scripts/`)
2. Add appropriate documentation
3. Update this README
4. Ensure proper error handling
5. Test thoroughly before committing