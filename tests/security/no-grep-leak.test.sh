#!/usr/bin/env bash
set -euo pipefail

# Small integration test to ensure scripts/security-review.sh does not leak raw grep output
# by printing lines in the form filename:line:content before should_ignore() runs.

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT_DIR/scripts/security-review.sh"

if [ ! -f "$SCRIPT" ]; then
  echo "❌ Cannot find $SCRIPT"
  exit 2
fi

TMP_OUT=$(mktemp)
TMP_STRIPPED=$(mktemp)
trap 'rm -f "$TMP_OUT" "$TMP_STRIPPED" security-findings.json security-review.log' EXIT

# Run the security review and capture all output
# We want to observe what a typical execution prints to stdout/stderr
if ! bash "$SCRIPT" >"$TMP_OUT" 2>&1; then
  # Even on failure, we still want to inspect output for leakage
  :
fi
# Remove generated artifacts to avoid interfering with format checks
rm -f security-findings.json security-review.log || true

# Strip ANSI color codes to avoid false positives during pattern matching
# ANSI pattern: \x1B[ ... letters
sed -E 's/\x1B\[[0-9;]*[[:alpha:]]//g' "$TMP_OUT" > "$TMP_STRIPPED"

# Detect classic grep style leaks: filename:line:content
# Our intentional output prints file and optional line as "path:line" (single colon pair) in the
# "Detailed Findings" section, which should NOT match this pattern because it lacks the trailing ':'
LEAK_LINES=$(grep -nE ':[0-9]+:' "$TMP_STRIPPED" || true)

if [ -n "$LEAK_LINES" ]; then
  COUNT=$(echo "$LEAK_LINES" | wc -l | xargs)
  echo "❌ GREP_OUTPUT_LEAKAGE_DETECTED: $COUNT line(s)"
  echo "Showing up to 25 offending line(s):"
  echo "$LEAK_LINES" | head -25
  echo "(…truncated if more than 25)"
  exit 1
fi

echo "✅ No grep output leakage detected."
exit 0

