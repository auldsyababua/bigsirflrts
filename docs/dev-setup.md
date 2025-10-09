# Development Environment Setup

This guide covers the installation and configuration of all tools needed for AWS
Lambda development and deployment for the BigSirFLRTS project.

## Prerequisites

- macOS (tested on Darwin 24.6.0)
- Homebrew package manager
- Git

## Required Tools

### 1. AWS CLI

The AWS Command Line Interface for managing AWS services.

#### Installation

The AWS CLI (version 2.27.2 or higher) is required for this project.

Check if AWS CLI is already installed:

```bash
aws --version
```

Expected output: `aws-cli/2.x.x` or higher

If AWS CLI is not installed, install it via Homebrew:

```bash
brew install awscli
```

Or download from the [official AWS website](https://aws.amazon.com/cli/).

#### Configuration

**Step 1: Configure AWS Credentials**

If you haven't configured AWS credentials yet, run:

```bash
aws configure
```

You'll be prompted for:

- AWS Access Key ID
- AWS Secret Access Key
- Default region (enter `us-east-1`)
- Default output format (enter `json` or leave blank)

Alternatively, use AWS SSO or IAM Identity Center for credential management.

**Step 2: Set the default region to us-east-1**

If you already have AWS credentials configured, ensure the region is set
correctly:

```bash
aws configure set region us-east-1
```

Verify configuration:

```bash
aws configure list
```

Expected output should show:

```
      Name                    Value             Type    Location
      ----                    -----             ----    --------
   profile                <not set>             None    None
access_key     ****************XXXX shared-credentials-file
secret_key     ****************XXXX shared-credentials-file
    region                us-east-1      config-file    ~/.aws/config
```

### 2. AWS SAM CLI

The AWS Serverless Application Model CLI for building and testing Lambda
functions locally.

#### Installation

Install AWS SAM CLI (version 1.144.0 or higher) via Homebrew:

```bash
brew install aws-sam-cli
```

#### Verification

```bash
sam --version
```

Expected output: `SAM CLI, version 1.144.0` or higher

Verify core commands are available:

```bash
sam init --help
sam build --help
```

Both commands should display help text without errors.

### 3. Node.js 22.x

Node.js runtime for Lambda functions and local development.

#### Installation via nvm (Node Version Manager)

Install Node Version Manager (nvm) version 0.40.1 or higher:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Load nvm in your current shell:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Install Node.js 22.x:

```bash
nvm install 22
nvm use 22
nvm alias default 22
```

#### Verification

```bash
node --version
npm --version
```

Expected output:

- Node: `v22.x.x`
- npm: `10.x.x` or higher

**Note**: New shell sessions will automatically load nvm and use Node.js 22.x as
the default version.

### 4. MCP Server Configuration

The project uses Model Context Protocol (MCP) servers for enhanced tooling.

#### Required MCP Servers

- **Linear MCP** (`@linear-server`): For issue tracking and project management
- **GitHub MCP** (`@github`): For repository and PR management
- **Filesystem MCP**: For local file operations (built-in to Claude Code)

#### Setup

MCP servers are configured in `~/.claude/settings.json` and
`~/.claude/settings.local.json`.

For detailed setup instructions:

1. See `~/claude-references/mcp-setup.md` for full MCP configuration guide
2. Linear MCP setup: Requires `LINEAR_API_KEY` environment variable
3. GitHub MCP setup: Requires `GITHUB_TOKEN` environment variable

#### Verification

Verify MCP connectivity by testing a Linear or GitHub operation through Claude
Code. For example, list Linear issues or search GitHub repositories.

## Environment Variables

### Required Variables

The following environment variables should be configured for full functionality:

| Variable         | Description                          | Example          |
| ---------------- | ------------------------------------ | ---------------- |
| `AWS_PROFILE`    | AWS CLI profile to use (optional)    | `default`        |
| `AWS_REGION`     | Default AWS region                   | `us-east-1`      |
| `LINEAR_API_KEY` | Linear API key for MCP integration   | `lin_api_xxx...` |
| `GITHUB_TOKEN`   | GitHub personal access token for MCP | `ghp_xxx...`     |

### Configuration

Environment variables can be set in:

- `~/.zshrc` or `~/.bashrc` for persistent shell configuration
- `~/.config/mcp/.env` for MCP-specific configuration
- Project-specific `.env` files (not committed to git)

**⚠️ Security Best Practices:**

- **NEVER commit actual API keys or tokens to version control**
- Use secret management tools (1Password, AWS Secrets Manager, etc.) for
  production credentials
- Keep `.env` files in `.gitignore` to prevent accidental commits
- Rotate API keys regularly
- Use least-privilege access for all tokens

Example `.zshrc` configuration:

```bash
# AWS Configuration
export AWS_REGION=us-east-1
export AWS_PROFILE=default

# MCP Configuration (replace with your actual keys)
export LINEAR_API_KEY="lin_api_YOUR_ACTUAL_KEY_HERE"
export GITHUB_TOKEN="ghp_YOUR_ACTUAL_TOKEN_HERE"
```

**Note**: The examples above show placeholder values. Replace them with your
actual API keys from secure storage.

## Acceptance Criteria Verification

Run these commands to verify your environment is correctly configured:

```bash
# AWS CLI
aws --version                    # Should show version 2.x.x or higher
aws configure list              # Should show region=us-east-1

# SAM CLI
sam --version                    # Should show version 1.x.x or higher
sam init --help                 # Should display help without errors
sam build --help                # Should display help without errors

# Node.js
node --version                   # Should show v22.x.x
npm --version                    # Should show 10.x.x or higher
```

## Testing the Setup

To verify your environment can build Lambda functions:

1. Create a test SAM application:

   ```bash
   mkdir -p /tmp/sam-test && cd /tmp/sam-test
   sam init --runtime nodejs22.x --name test-app --app-template hello-world --no-interactive
   cd test-app
   ```

2. Build the application:

   ```bash
   sam build
   ```

3. Expected result: Build completes successfully with output showing "Build
   Succeeded"

4. Clean up:

   ```bash
   cd ~ && rm -rf /tmp/sam-test
   ```

## Troubleshooting

### Node.js version issues

If `node --version` doesn't show v22.x.x:

```bash
# Reload nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Switch to Node 22
nvm use 22
```

### AWS CLI configuration issues

If AWS region is not us-east-1:

```bash
aws configure set region us-east-1
aws configure list  # Verify
```

### SAM CLI not found

If `sam` command is not found after installation:

```bash
# Ensure Homebrew bin is in PATH
echo $PATH | grep homebrew

# Reload shell configuration
source ~/.zshrc  # or source ~/.bashrc
```

## Related Documentation

- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [AWS SAM CLI Installation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [nvm GitHub Repository](https://github.com/nvm-sh/nvm)
- [Node.js 22.x Documentation](https://nodejs.org/docs/latest-v22.x/api/)

## Issue Reference

This setup guide addresses issue **10N-273**: Install AWS tooling and remote
access dependencies.
