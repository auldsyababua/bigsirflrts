#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; NC="\033[0m"
ok() { echo -e "${GREEN}OK${NC}  $*"; }
warn() { echo -e "${YELLOW}WARN${NC} $*"; }
fail() { echo -e "${RED}FAIL${NC} $*"; }

have_rg=true
command -v rg >/dev/null 2>&1 || have_rg=false

echo "BMAD QA Gate — BIGSIRFLRTS"
echo "Repo: $(basename "$ROOT_DIR")  Node: $(node -v 2>/dev/null || echo n/a)"
echo "-------------------------------------------"

exit_code=0

# Invariants: required files
[[ -f .bmad-core/core-config.yaml ]] && ok ".bmad-core/core-config.yaml present" || { fail ".bmad-core/core-config.yaml missing"; exit_code=1; }
[[ -f docs/architecture/adr/ADR-001-n8n-deployment-mode.md ]] && ok "ADR-001 present" || { fail "ADR-001 missing"; exit_code=1; }
[[ -f docs/architecture/adr/ADR-002-openproject-migration-pattern.md ]] && ok "ADR-002 present" || { fail "ADR-002 missing"; exit_code=1; }

# Database consolidation: detect local Postgres containers in compose files
if $have_rg; then
  if rg -n "image:\s*postgres" --glob '**/docker-compose*.yml' --glob '!node_modules/**' >/dev/null; then
    warn "Compose files reference a Postgres image. Ensure production uses Supabase only."
  else
    ok "No Postgres containers referenced in compose files"
  fi
else
  warn "ripgrep not found; skipping Postgres image scan"
fi

# P0 test tags present
if $have_rg; then
  if rg -n "@P0" tests >/dev/null; then
    ok "P0 tests detected"
  else
    warn "No @P0 tags found under tests/"
  fi
fi

echo "-------------------------------------------"
echo "Running quality checks (lint, format:check, test:mvp)"

if npm run -s lint; then ok "lint"; else fail "lint"; exit_code=1; fi
if npm run -s format:check; then ok "format:check"; else fail "format:check"; exit_code=1; fi
if npm run -s test:mvp; then ok "test:mvp"; else fail "test:mvp"; exit_code=1; fi

echo "-------------------------------------------"
if [[ "$exit_code" -eq 0 ]]; then
  echo -e "${GREEN}BMAD QA Gate passed.${NC} Attach this summary to your PR."
else
  echo -e "${RED}BMAD QA Gate failed.${NC} See failures above."
fi

exit "$exit_code"

