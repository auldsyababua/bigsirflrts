#!/bin/bash

echo "🔍 Setting up smart search for FLRTS project"
echo "==========================================="

# 1. Install ripgrep if not present (much faster than grep)
if ! command -v rg &> /dev/null; then
    echo "→ Installing ripgrep (faster, smarter grep)..."
    brew install ripgrep
else
    echo "✓ ripgrep already installed"
fi

# 2. Create shell aliases for grep with automatic exclusions
SHELL_RC="$HOME/.zshrc"  # Change to .bashrc if using bash

echo "→ Adding smart grep aliases to $SHELL_RC..."

# Check if aliases already exist
if ! grep -q "FLRTS smart search aliases" "$SHELL_RC" 2>/dev/null; then
    cat >> "$SHELL_RC" << 'EOF'

# FLRTS smart search aliases (added by setup-smart-search.sh)
# These work globally but are especially useful in FLRTS project

# Smart grep that excludes common bloat
alias sgrep='grep -r --exclude-dir={node_modules,.git,archive,ARCHIVE,deprecated,backup,old,dist,build,coverage,.bmad-core,.claude,.cursor,.gemini,.qodo} --exclude="*.min.js" --exclude="*.bundle.js" --exclude="*.log" --exclude="*.gif" --exclude="*.jpg" --exclude="*.png"'

# Even smarter find
alias sfind='find . -type f -not -path "*/node_modules/*" -not -path "*/archive/*" -not -path "*/ARCHIVE*/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*"'

# Use ripgrep by default (it respects .rgignore automatically)
alias grep='rg'

# Original grep if needed
alias ogrep='/usr/bin/grep'

EOF
    echo "✓ Added smart search aliases"
else
    echo "✓ Smart search aliases already configured"
fi

# 3. Create global ripgrep config
echo "→ Setting up global ripgrep configuration..."
mkdir -p "$HOME/.config/ripgrep"

cat > "$HOME/.config/ripgrep/config" << 'EOF'
# Global ripgrep configuration
# Automatically excludes these patterns everywhere

# Dependencies
--glob=!node_modules/
--glob=!**/node_modules/

# Archives
--glob=!**/archive/
--glob=!**/ARCHIVE*/
--glob=!**/deprecated/
--glob=!**/backup/

# Build artifacts
--glob=!dist/
--glob=!build/
--glob=!*.min.js
--glob=!*.bundle.js

# Binary files
--glob=!*.gif
--glob=!*.jpg
--glob=!*.jpeg
--glob=!*.png
--glob=!*.zip
--glob=!*.tar
--glob=!*.gz

# Hidden dirs (except .github)
--glob=!.git/
--glob=!.bmad-core/
--glob=!.claude/
--glob=!.cursor/

# Use smart case (case-insensitive unless pattern has uppercase)
--smart-case

# Show line numbers
--line-number

# Pretty colors
--color=auto
EOF

# 4. Set RIPGREP_CONFIG_PATH environment variable
if ! grep -q "RIPGREP_CONFIG_PATH" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Ripgrep configuration" >> "$SHELL_RC"
    echo "export RIPGREP_CONFIG_PATH=\"$HOME/.config/ripgrep/config\"" >> "$SHELL_RC"
    echo "✓ Set RIPGREP_CONFIG_PATH"
else
    echo "✓ RIPGREP_CONFIG_PATH already set"
fi

# 5. Create project-specific git config for grep exclusions
echo "→ Configuring git grep exclusions..."
cd ~/Desktop/projects/bigsirflrts
git config grep.excludeFile .grep-exclude
echo "✓ Git grep will now use .grep-exclude"

echo ""
echo "✅ Setup complete!"
echo ""
echo "What this does:"
echo "• 'grep' now uses ripgrep with smart exclusions"
echo "• 'sgrep' provides smart grep with traditional grep"
echo "• 'sfind' provides smart find"
echo "• .rgignore file in project for project-specific exclusions"
echo "• Global ripgrep config for system-wide exclusions"
echo ""
echo "⚠️  IMPORTANT: Restart your terminal or run:"
echo "   source $SHELL_RC"
echo ""
echo "Now agents using grep/rg will automatically skip:"
echo "• All node_modules directories"
echo "• All archive/ARCHIVE folders"
echo "• Binary files (images, etc.)"
echo "• Build artifacts"
echo "• Hidden directories (except .github)"