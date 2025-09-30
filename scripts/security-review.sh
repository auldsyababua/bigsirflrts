#!/usr/bin/env bash
set -euo pipefail

# Security Review Script for FLRTS
# Runs automated security checks before code is pushed
# Called by .husky/pre-push hook

echo "🔒 Running Security Review..."

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we should skip security review
if [ "${SKIP_SECURITY:-}" = "1" ]; then
  echo "⏭️  SKIP_SECURITY=1 set — skipping security review"
  exit 0
fi

# Temporary file for findings
FINDINGS_FILE=$(mktemp)
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

cleanup() {
  rm -f "$FINDINGS_FILE"
}
trap cleanup EXIT

# Function to add finding
add_finding() {
  local severity=$1
  local message=$2
  local file=$3
  local line=${4:-""}

  echo "$severity|$message|$file|$line" >> "$FINDINGS_FILE"

  case $severity in
    CRITICAL) ((CRITICAL_COUNT++)) ;;
    HIGH) ((HIGH_COUNT++)) ;;
    MEDIUM) ((MEDIUM_COUNT++)) ;;
    LOW) ((LOW_COUNT++)) ;;
  esac
}

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}  Security Review - Checking for vulnerabilities${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get changed files (staged + unstaged) or all .ts/.js files if no changes
CHANGED_FILES=$(git diff --name-only --diff-filter=d HEAD 2>/dev/null || echo "")
if [ -z "$CHANGED_FILES" ]; then
  # No changes, check staged files
  CHANGED_FILES=$(git diff --cached --name-only --diff-filter=d 2>/dev/null || echo "")
fi

# If still no files, we're probably on a new branch, get all source files
if [ -z "$CHANGED_FILES" ]; then
  echo "ℹ️  No changes detected, scanning all TypeScript/JavaScript files..."
  CHANGED_FILES=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/archive/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" 2>/dev/null || echo "")
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "${GREEN}✅ No files to review${NC}"
  exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | xargs)
echo "📁 Reviewing $FILE_COUNT file(s)..."
echo ""

# Check 1: Hardcoded Secrets
echo "🔍 Checking for hardcoded secrets..."
if echo "$CHANGED_FILES" | xargs grep -nHE "(password|secret|api[_-]?key|private[_-]?key|token)\s*=\s*['\"]([^'\"]{8,})" 2>/dev/null | grep -v "test" | grep -v "EXAMPLE" | grep -v "\.env"; then
  add_finding "CRITICAL" "Potential hardcoded secret detected" "multiple" ""
fi

# Check 2: SQL Injection
echo "🔍 Checking for SQL injection risks..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    # Look for SQL queries with template literals (excluding parameterized queries)
    if grep -nHE "(SELECT|INSERT|UPDATE|DELETE|DROP).*(\\$\\{|\\+\s*[a-zA-Z_])" "$file" 2>/dev/null | grep -v "SECURITY-REVIEWED"; then
      add_finding "HIGH" "Potential SQL injection - use parameterized queries" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 3: XSS Vulnerabilities
echo "🔍 Checking for XSS vulnerabilities..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.jsx ]]; then
    if grep -nHE "(innerHTML|dangerouslySetInnerHTML|document\\.write)" "$file" 2>/dev/null | grep -v "SECURITY-REVIEWED"; then
      add_finding "HIGH" "Potential XSS vulnerability" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 4: Command Injection
echo "🔍 Checking for command injection risks..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    if grep -nHE "exec\\(|spawn\\(|system\\(" "$file" 2>/dev/null | grep "\${" | grep -v "SECURITY-REVIEWED"; then
      add_finding "HIGH" "Potential command injection - validate/sanitize input" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 5: Insecure CORS
echo "🔍 Checking CORS configurations..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    if grep -nHE "Access-Control-Allow-Origin.*\\*" "$file" 2>/dev/null | grep -v "SECURITY-REVIEWED"; then
      add_finding "MEDIUM" "Wildcard CORS (*) - restrict to specific origins" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 6: Eval Usage
echo "🔍 Checking for eval() usage..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    if grep -nHE "\\beval\\(|new Function\\(" "$file" 2>/dev/null | grep -v "SECURITY-REVIEWED"; then
      add_finding "HIGH" "Dangerous eval() or Function() constructor usage" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 7: Weak Crypto
echo "🔍 Checking cryptographic implementations..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    if grep -nHE "(md5|sha1)\\(" "$file" 2>/dev/null | grep -v "SECURITY-REVIEWED"; then
      add_finding "MEDIUM" "Weak hashing algorithm (MD5/SHA1) - use SHA-256+" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 8: Missing Authentication
echo "🔍 Checking for missing authentication..."
while IFS= read -r file; do
  if [[ "$file" == *"edge-function"* ]] || [[ "$file" == *"api"* ]]; then
    if ! grep -qE "(auth|token|jwt|authorization)" "$file" 2>/dev/null; then
      add_finding "MEDIUM" "API endpoint may be missing authentication" "$file" ""
    fi
  fi
done <<< "$CHANGED_FILES"

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}  Security Review Results${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Display results
TOTAL_FINDINGS=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT))

if [ $TOTAL_FINDINGS -eq 0 ]; then
  echo "${GREEN}✅ No security issues detected!${NC}"
  echo ""
  echo "Files reviewed: $FILE_COUNT"
  exit 0
fi

echo "📊 Findings Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
[ $CRITICAL_COUNT -gt 0 ] && echo "${RED}🚨 CRITICAL: $CRITICAL_COUNT${NC}"
[ $HIGH_COUNT -gt 0 ] && echo "${RED}❗ HIGH: $HIGH_COUNT${NC}"
[ $MEDIUM_COUNT -gt 0 ] && echo "${YELLOW}⚠️  MEDIUM: $MEDIUM_COUNT${NC}"
[ $LOW_COUNT -gt 0 ] && echo "${YELLOW}ℹ️  LOW: $LOW_COUNT${NC}"
echo ""

# Display detailed findings
if [ -f "$FINDINGS_FILE" ] && [ -s "$FINDINGS_FILE" ]; then
  echo "Detailed Findings:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  while IFS='|' read -r severity message file line; do
    case $severity in
      CRITICAL) COLOR=$RED; ICON="🚨" ;;
      HIGH) COLOR=$RED; ICON="❗" ;;
      MEDIUM) COLOR=$YELLOW; ICON="⚠️" ;;
      LOW) COLOR=$YELLOW; ICON="ℹ️" ;;
    esac
    echo "${COLOR}${ICON} ${severity}${NC}: $message"
    echo "   📄 $file${line:+:$line}"
    echo ""
  done < "$FINDINGS_FILE"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Decide if we should block the push
if [ $CRITICAL_COUNT -gt 0 ] || [ $HIGH_COUNT -gt 0 ]; then
  echo "${RED}❌ Security review FAILED${NC}"
  echo ""
  echo "Critical or High severity issues detected."
  echo "Please fix these issues before pushing."
  echo ""
  echo "Options:"
  echo "  1. Fix the issues and try again"
  echo "  2. Add ${YELLOW}// SECURITY-REVIEWED: [reason]${NC} if false positive"
  echo "  3. Skip with: ${YELLOW}SKIP_SECURITY=1 git push${NC} (not recommended)"
  echo ""
  exit 1
else
  echo "${YELLOW}⚠️  Security review completed with warnings${NC}"
  echo ""
  echo "Medium/Low severity issues detected."
  echo "Please review and address when possible."
  echo ""
  echo "Allowing push to continue..."
  exit 0
fi