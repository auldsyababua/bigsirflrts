#!/bin/bash

echo "🧹 FLRTS Context Cleanup Script"
echo "================================"

# 1. Remove duplicate node_modules from archives
echo "→ Removing archive node_modules (49MB)..."
rm -rf ./docs/archive/2025-01-13-cleanup/obsolete-packages/sync-service/node_modules

# 2. Check if nlp-service needs its own node_modules
echo "→ Checking nlp-service dependencies..."
if [ -f "./packages/nlp-service/package.json" ]; then
    echo "  ⚠️  nlp-service has package.json - keeping node_modules for now"
    echo "  Consider using workspace/monorepo setup instead"
else
    echo "  Removing nlp-service node_modules (63MB)..."
    rm -rf ./packages/nlp-service/node_modules
fi

# 3. Remove large binary files
echo "→ Removing large binaries..."
rm -f ./ARCHIVE\(DEPRACATED\)/.ui2/docs/public/ui2-photo-editor-demo.gif
echo "  Removed 2.7MB GIF"

# 4. Move openproject-cli to global
echo "→ Moving openproject-cli to global installation..."
if [ -f "./tools/openproject-cli/op-cli" ]; then
    echo "  Installing globally to ~/bin/..."
    mkdir -p ~/bin
    cp ./tools/openproject-cli/op-cli ~/bin/
    chmod +x ~/bin/op-cli
    rm -rf ./tools/openproject-cli
    echo "  ✓ Moved to ~/bin/op-cli (add ~/bin to PATH if needed)"
fi

# 5. Create archive directory outside project
echo "→ Setting up external archive..."
ARCHIVE_DIR="$HOME/Desktop/flrts-archives"
mkdir -p "$ARCHIVE_DIR"
echo "  Created $ARCHIVE_DIR"

# 6. Move archives outside project
echo "→ Moving archives..."
if [ -d "./ARCHIVE(DEPRACATED)" ]; then
    mv "./ARCHIVE(DEPRACATED)" "$ARCHIVE_DIR/ARCHIVE-$(date +%Y%m%d)"
    echo "  Moved ARCHIVE(DEPRACATED)"
fi

if [ -d "./docs/archive" ]; then
    mv "./docs/archive" "$ARCHIVE_DIR/docs-archive-$(date +%Y%m%d)"
    echo "  Moved docs/archive"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Space saved: ~115MB+"
echo "Archive location: $ARCHIVE_DIR"
echo ""
echo "Next steps:"
echo "1. Update .gitignore with better exclusions"
echo "2. Commit these changes"
echo "3. Push to origin (you're 14 commits ahead)"