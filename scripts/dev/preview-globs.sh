#!/usr/bin/env bash
set -euo pipefail

# Source patterns from the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
CHECK_SCRIPT="$SCRIPT_DIR/check-port-bindings.sh"

# shellcheck source=/dev/null
source "$CHECK_SCRIPT"

echo "Root: $(pwd)"
echo

i=0
for pattern in "${PROD_PATTERNS[@]}"; do
  ((i++))
  echo "[$i] pattern: $pattern"
  # Reuse the same matching logic as in the fixed function
  if [[ "$pattern" == \*\*/* ]]; then
    basename="${pattern#\*\*/}"
    find . -type f -name "$basename" | sed 's/^/  → /' || true
  elif [[ "$pattern" == */* && "$pattern" == *\** ]]; then
    dir="${pattern%/*}"
    filepattern="${pattern##*/}"
    find "./$dir" -maxdepth 1 -type f -name "$filepattern" 2>/dev/null | sed 's/^/  → /' || true
  else
    if [[ -f "$pattern" ]]; then
      case "$pattern" in ./*) echo "  → $pattern";; *) echo "  → ./$pattern";; esac
    else
      find . -type f -path "./$pattern" 2>/dev/null | sed 's/^/  → /' || true
    fi
  fi
  echo
done

