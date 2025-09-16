#!/bin/bash

echo "🔧 Fixing duplicate node_modules with npm workspaces"
echo "===================================================="

# 1. Backup current setup
echo "→ Backing up package files..."
cp package.json package.json.backup
cp packages/nlp-service/package.json packages/nlp-service/package.json.backup

# 2. Update root package.json to use workspaces
echo "→ Setting up npm workspaces..."
cat > package-workspace.json << 'EOF'
{
  "name": "bigsirflrts",
  "version": "0.1.0",
  "private": true,
  "description": "FLRTS project with NLP service",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "test:mvp": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run tests/unit --reporter=dot -t @P0",
    "test:integration": "vitest run tests/integration --reporter=dot -t @P0",
    "test:e2e": "playwright test tests/e2e --grep @P0",
    "test:smoke": "bash tests/mvp-smoke-test.sh",
    "lint": "npm run lint:js && npm run lint:md && npm run lint:shell",
    "lint:js": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:md": "markdownlint '**/*.md' --ignore node_modules --ignore docs/archive",
    "lint:shell": "shellcheck **/*.sh || true",
    "lint:fix": "npm run lint:js -- --fix && npm run lint:md -- --fix",
    "format": "prettier --write '**/*.{js,jsx,ts,tsx,json,md,yml,yaml}'",
    "format:check": "prettier --check '**/*.{js,jsx,ts,tsx,json,md,yml,yaml}'",
    "nlp:dev": "npm run dev --workspace=nlp-service",
    "nlp:build": "npm run build --workspace=nlp-service",
    "nlp:start": "npm run start --workspace=nlp-service"
  },
  "devDependencies": {
    "@playwright/test": "^1.46.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "markdownlint-cli": "^0.39.0",
    "playwright": "^1.46.0",
    "prettier": "^3.2.5",
    "typescript": "^5.4.0",
    "vitest": "^3.2.4",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "nodemon": "^3.1.10",
    "tsx": "^4.20.5"
  },
  "engines": {
    "node": ">=18"
  }
}
EOF

echo ""
echo "✅ Workspace configuration created!"
echo ""
echo "To activate workspaces and save 63MB:"
echo ""
echo "1. Review the changes:"
echo "   diff package.json package-workspace.json"
echo ""
echo "2. If it looks good, apply it:"
echo "   mv package-workspace.json package.json"
echo "   rm -rf packages/nlp-service/node_modules"
echo "   npm install"
echo ""
echo "3. Now you can run NLP service from root:"
echo "   npm run nlp:dev    # Start NLP service"
echo "   npm run nlp:build  # Build NLP service"
echo ""
echo "This will:"
echo "• Share common packages (TypeScript, etc.) - saves 63MB"
echo "• Install all dependencies with one 'npm install'"
echo "• Run NLP service commands from project root"
echo "• Keep everything in sync automatically"