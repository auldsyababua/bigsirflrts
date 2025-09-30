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

# Temporary files for findings
FINDINGS_FILE=$(mktemp)
JSON_OUTPUT="security-findings.json"
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

cleanup() {
  rm -f "$FINDINGS_FILE"
  # Keep JSON_OUTPUT for CI consumption
}
trap cleanup EXIT

# Function to check if finding should be ignored
should_ignore() {
  local file=$1
  local check_name=$2

  # Check if .security-ignore exists
  if [ ! -f ".security-ignore" ]; then
    return 1  # Don't ignore
  fi

  # Read .security-ignore and check for matches
  while IFS='|' read -r pattern check reason; do
    # Skip comments and empty lines
    [[ "$pattern" =~ ^#.*$ ]] && continue
    [[ -z "$pattern" ]] && continue

    # Remove leading ./ from file path for matching
    local clean_file="${file#./}"

    # Convert glob pattern to regex for matching
    # Order matters: Replace **/ before * to handle multi-char wildcards correctly
    local regex_pattern="$pattern"

    # Replace **/ with placeholder to protect it
    regex_pattern="${regex_pattern//\*\*\//____DOUBLESTAR____}"

    # Escape literal dots
    regex_pattern="${regex_pattern//./\\.}"

    # Convert remaining * to [^/]+ (filename wildcard)
    regex_pattern="${regex_pattern//\*/[^/]+}"

    # Convert ? to . (single char wildcard)
    regex_pattern="${regex_pattern//\?/.}"

    # Replace placeholder with (.*/)?  (zero or more directory levels)
    # Note: (/[^/]+)*/ is greedy and consumes the filename too
    regex_pattern="${regex_pattern//____DOUBLESTAR____/(.*/)?}"

    # Anchor pattern
    regex_pattern="^${regex_pattern}$"

    # Check if file matches pattern and check name matches
    if [[ "$clean_file" =~ $regex_pattern ]] && [[ "$check" == "$check_name" || "$check" == "*" ]]; then
      return 0  # Should ignore
    fi
  done < ".security-ignore"

  return 1  # Don't ignore
}

# Function to add finding
add_finding() {
  local severity=$1
  local message=$2
  local file=$3
  local line=${4:-""}
  local check_name=${5:-"unknown"}

  # Check if this finding should be ignored
  if should_ignore "$file" "$check_name"; then
    return 0
  fi

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
# Safely determine changed files; tolerate non-git contexts
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CHANGED_FILES="$(git diff --name-only --diff-filter=d HEAD 2>/dev/null || true)"
  if [ -z "$CHANGED_FILES" ]; then
    # No changes, check staged files
    CHANGED_FILES="$(git diff --cached --name-only --diff-filter=d 2>/dev/null || true)"
  fi
else
  CHANGED_FILES=""
fi

# If still no files, scan all relevant source files
if [ -z "$CHANGED_FILES" ]; then
  echo "ℹ️  No changes detected, scanning all TypeScript/JavaScript files..."
  CHANGED_FILES="$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/archive/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" 2>/dev/null || true)"
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
# Capture and parse matches to avoid leaking raw grep output
while IFS=: read -r filename linenum content; do
  add_finding "CRITICAL" "Potential hardcoded secret detected" "$filename" "$linenum" "hardcoded-secrets"
done < <(echo "$CHANGED_FILES" | xargs grep -nHE "(password|secret|api[_-]?key|private[_-]?key|token)\s*=\s*['\"]([^'\"]{8,})" 2>/dev/null | grep -v "test" | grep -v "EXAMPLE" | grep -v "\.env" || true)

# Check 2: SQL Injection
echo "🔍 Checking for SQL injection risks..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    # Look for SQL queries with template literals (excluding parameterized queries)
    # Check if SECURITY-REVIEWED appears within 10 lines before the match
    while IFS=: read -r filename linenum content; do
      # Get 10 lines before the match to check for SECURITY-REVIEWED
      start_line=$((linenum - 10))
      [ $start_line -lt 1 ] && start_line=1
      context=$(sed -n "${start_line},${linenum}p" "$filename" 2>/dev/null)
      if ! echo "$context" | grep -q "SECURITY-REVIEWED"; then
        add_finding "HIGH" "Potential SQL injection - use parameterized queries" "$filename" "$linenum" "sql-injection"
      fi
    done < <(grep -nHE "(SELECT|INSERT|UPDATE|DELETE|DROP).*(\\$\\{|\\+\s*[a-zA-Z_])" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 3: XSS Vulnerabilities
echo "🔍 Checking for XSS vulnerabilities..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.jsx ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        add_finding "HIGH" "Potential XSS vulnerability" "$filename" "$linenum" "xss"
      fi
    done < <(grep -nHE "(innerHTML|dangerouslySetInnerHTML|document\\.write)" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 4: Command Injection
echo "🔍 Checking for command injection risks..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    while IFS=: read -r filename linenum content; do
      # Require variable interpolation to consider as risk
      if [[ "$content" != *\$\{* ]]; then
        continue
      fi
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        add_finding "HIGH" "Potential command injection - validate/sanitize input" "$filename" "$linenum" "command-injection"
      fi
    done < <(grep -nHE "exec\\(|spawn\\(|system\\(" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 5: Insecure CORS
echo "🔍 Checking CORS configurations..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        add_finding "MEDIUM" "Wildcard CORS (*) - restrict to specific origins" "$filename" "$linenum" "cors-wildcard"
      fi
    done < <(grep -nHE "Access-Control-Allow-Origin.*\\*" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 6: Eval Usage
echo "🔍 Checking for eval() usage..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        add_finding "HIGH" "Dangerous eval() or Function() constructor usage" "$filename" "$linenum" "eval-usage"
      fi
    done < <(grep -nHE "\\beval\\(|new Function\\(" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 7: Weak Crypto
echo "🔍 Checking cryptographic implementations..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        add_finding "MEDIUM" "Weak hashing algorithm (MD5/SHA1) - use SHA-256+" "$filename" "$linenum" "weak-crypto"
      fi
    done < <(grep -nHE "(md5|sha1)\\(" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 8: Missing Authentication
echo "🔍 Checking for missing authentication..."
while IFS= read -r file; do
  if [[ "$file" == *"edge-function"* ]] || [[ "$file" == *"api"* ]]; then
    if ! grep -qE "(auth|token|jwt|authorization)" "$file" 2>/dev/null; then
      add_finding "MEDIUM" "API endpoint may be missing authentication" "$file" "" "missing-auth"
    fi
  fi
done <<< "$CHANGED_FILES"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLRTS-SPECIFIC SECURITY CHECKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Check 9: Telegram Webhook Signature Validation
echo "🔍 [FLRTS] Checking Telegram webhook signature validation..."
while IFS= read -r file; do
  if [[ "$file" == *"telegram"* ]] && [[ "$file" == *.ts ]]; then
    # Check if file handles Telegram webhooks but doesn't validate signature
    if grep -qE "(webhook|telegram)" "$file" 2>/dev/null; then
      if ! grep -qE "(X-Telegram-Bot-Api-Secret-Token|verifySignature|validateWebhook)" "$file" 2>/dev/null; then
        add_finding "CRITICAL" "Telegram webhook missing signature validation - implement X-Telegram-Bot-Api-Secret-Token check" "$file" "" "telegram-signature"
      fi
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 10: Supabase Service Role Key Exposure
echo "🔍 [FLRTS] Checking for Supabase service role key exposure..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    # Check for service_role key in client-side code
    if [[ "$file" != *"edge-function"* ]] && [[ "$file" != *"server"* ]]; then
      while IFS=: read -r filename linenum content; do
        start=$((linenum - 10)); [ $start -lt 1 ] && start=1
        if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
          add_finding "CRITICAL" "Supabase service_role key detected in client-side code" "$filename" "$linenum" "service-role-exposure"
        fi
      done < <(grep -nHE "service_role|SUPABASE_SERVICE.*KEY" "$file" 2>/dev/null || true)
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 11: RLS Bypass Detection
echo "🔍 [FLRTS] Checking for RLS bypass patterns..."
while IFS= read -r file; do
  if [[ "$file" == *"edge-function"* ]] || [[ "$file" == *"supabase"* ]]; then
    has_violation=false
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        has_violation=true
        break
      fi
    done < <(grep -nHE "service_role" "$file" 2>/dev/null || true)
    if [ "$has_violation" = true ]; then
      if ! grep -qE "(RLS_BYPASS|security:.*rls|Row Level Security)" "$file" 2>/dev/null; then
        add_finding "HIGH" "service_role usage without RLS bypass documentation" "$file" "" "rls-bypass"
      fi
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 12: Natural Language Input Sanitization
echo "🔍 [FLRTS] Checking natural language input handling..."
while IFS= read -r file; do
  # Skip test files - they're covered by .security-ignore
  if [[ "$file" == *"test"* ]] || [[ "$file" == *"spec"* ]]; then
    continue
  fi

  # Only check files that actually handle user input (not just "parse" in filename)
  if grep -qE "(message\.text|update\.message|req\.body.*text|request\.json)" "$file" 2>/dev/null; then
    # Flag only if BOTH conditions: has user input AND no sanitization found
    if ! grep -qE "(sanitize|validate|escape|trim|filter|zod|schema\.parse)" "$file" 2>/dev/null; then
      add_finding "HIGH" "User input handling without sanitization - validate before use" "$file" "" "nlp-sanitization"
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 13: Missing Rate Limiting on Webhooks
echo "🔍 [FLRTS] Checking webhook rate limiting..."
while IFS= read -r file; do
  if [[ "$file" == *"webhook"* ]] || [[ "$file" == *"telegram"* ]]; then
    if grep -qE "Deno\.serve|export.*handler" "$file" 2>/dev/null; then
      if ! grep -qE "(rateLimit|throttle|Upstash|redis.*rate)" "$file" 2>/dev/null; then
        add_finding "MEDIUM" "Webhook endpoint missing rate limiting - consider Upstash Rate Limit" "$file" "" "rate-limiting"
      fi
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 14: Telegram Message HTML/Markdown Injection
echo "🔍 [FLRTS] Checking Telegram message sanitization..."
while IFS= read -r file; do
  if [[ "$file" == *"telegram"* ]] && [[ "$file" == *.ts ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        if ! grep -qE "(escapeHtml|sanitize.*markdown|stripHtml)" "$filename" 2>/dev/null; then
          add_finding "MEDIUM" "Telegram message using HTML/Markdown without sanitization" "$filename" "$linenum" "telegram-html-injection"
        fi
      fi
    done < <(grep -nHE "sendMessage.*parse_mode.*(HTML|Markdown)" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 15: N8N Webhook URL Exposure
echo "🔍 [FLRTS] Checking N8N webhook URL handling..."
while IFS= read -r file; do
  if [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        # Exclude .env files
        if [[ "$filename" != *.env* ]]; then
          add_finding "HIGH" "N8N webhook URL hardcoded - use environment variable" "$filename" "$linenum" "n8n-webhook-url"
        fi
      fi
    done < <(grep -nHE "https?://.*n8n.*webhook" "$file" 2>/dev/null | grep -v "\.env" || true)
  fi
done <<< "$CHANGED_FILES"

# Check 16: Unsafe Deno Permission Usage
echo "🔍 [FLRTS] Checking Deno permission usage..."
while IFS= read -r file; do
  if [[ "$file" == *"edge-function"* ]] || [[ "$file" == *"supabase/functions"* ]]; then
    while IFS=: read -r filename linenum content; do
      start=$((linenum - 10)); [ $start -lt 1 ] && start=1
      if ! sed -n "${start},${linenum}p" "$filename" 2>/dev/null | grep -q "SECURITY-REVIEWED"; then
        add_finding "HIGH" "Deno --allow-all permission detected - use granular permissions" "$filename" "$linenum" "deno-permissions"
      fi
    done < <(grep -nHE "Deno\.(run|spawn).*--allow-all" "$file" 2>/dev/null || true)
  fi
done <<< "$CHANGED_FILES"

# Check 17: Missing Input Length Validation
echo "🔍 [FLRTS] Checking input length validation for DoS..."
while IFS= read -r file; do
  if [[ "$file" == *"telegram"* ]] || [[ "$file" == *"parse"* ]]; then
    if grep -qE "message\.text|req\.body|request\.json" "$file" 2>/dev/null; then
      if ! grep -qE "(\.length.*>|maxLength|MAX_.*LENGTH|substring\(0,)" "$file" 2>/dev/null; then
        add_finding "MEDIUM" "Input handling without length validation - DoS risk" "$file" "" "input-length-validation"
      fi
    fi
  fi
done <<< "$CHANGED_FILES"

# Check 18: Dependency Vulnerabilities (npm audit)
echo "🔍 Checking for vulnerable dependencies..."
if command -v npm &> /dev/null; then
  AUDIT_TEMP=$(mktemp)
  if npm audit --audit-level=high --json > "$AUDIT_TEMP" 2>&1; then
    echo "✅ No high/critical vulnerabilities in dependencies"
  else
    # Parse npm audit JSON output
    if command -v jq &> /dev/null; then
      HIGH_VULNS=$(jq -r '.metadata.vulnerabilities.high // 0' "$AUDIT_TEMP" 2>/dev/null || echo "0")
      CRITICAL_VULNS=$(jq -r '.metadata.vulnerabilities.critical // 0' "$AUDIT_TEMP" 2>/dev/null || echo "0")
      TOTAL_VULNS=$((HIGH_VULNS + CRITICAL_VULNS))

      if [ "$TOTAL_VULNS" -gt 0 ]; then
        add_finding "HIGH" "Found $TOTAL_VULNS high/critical vulnerabilities in dependencies - run 'npm audit fix'" "package.json" "" "dependency-vulnerabilities"

        # Extract specific vulnerability details
        jq -r '.vulnerabilities | to_entries[] | select(.value.severity == "high" or .value.severity == "critical") | "\(.key): \(.value.severity) - \(.value.via[0].title // "See npm audit for details")"' "$AUDIT_TEMP" 2>/dev/null | head -5 | while read -r vuln_detail; do
          echo "   └─ $vuln_detail"
        done
      fi
    else
      # Fallback if jq not available - just check exit code
      add_finding "HIGH" "npm audit detected vulnerabilities - run 'npm audit' for details" "package.json" "" "dependency-vulnerabilities"
    fi
  fi
  rm -f "$AUDIT_TEMP"
else
  echo "⚠️  npm not found, skipping dependency vulnerability check"
fi

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}  Security Review Results${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate JSON output for CI consumption
generate_json_output() {
  cat > "$JSON_OUTPUT" <<EOF
{
  "summary": {
    "total": $TOTAL_FINDINGS,
    "critical": $CRITICAL_COUNT,
    "high": $HIGH_COUNT,
    "medium": $MEDIUM_COUNT,
    "low": $LOW_COUNT,
    "files_reviewed": $FILE_COUNT
  },
  "findings": [
EOF

  # Add findings as JSON array
  local first=true
  if [ -f "$FINDINGS_FILE" ] && [ -s "$FINDINGS_FILE" ]; then
    while IFS='|' read -r severity message file line; do
      if [ "$first" = true ]; then
        first=false
      else
        echo "," >> "$JSON_OUTPUT"
      fi

      # Escape quotes in message and file for JSON
      message_json=$(echo "$message" | sed 's/"/\\"/g')
      file_json=$(echo "$file" | sed 's/"/\\"/g')

      cat >> "$JSON_OUTPUT" <<FINDING
    {
      "severity": "$severity",
      "message": "$message_json",
      "file": "$file_json",
      "line": "${line:-null}"
    }
FINDING
    done < "$FINDINGS_FILE"
  fi

  cat >> "$JSON_OUTPUT" <<EOF

  ],
  "status": "$([ $CRITICAL_COUNT -eq 0 ] && [ $HIGH_COUNT -eq 0 ] && echo "warning" || echo "failed")"
}
EOF

  # Output JSON_OUTPUT path for CI to read
  echo "JSON_OUTPUT_PATH=$JSON_OUTPUT" >> "${GITHUB_OUTPUT:-/dev/null}"
}

# Display results
TOTAL_FINDINGS=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT))

# Generate JSON output regardless of findings
generate_json_output

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