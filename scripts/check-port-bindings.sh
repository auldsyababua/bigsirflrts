#!/usr/bin/env bash
# check-port-bindings.sh
# Validates that production Docker Compose files use localhost-only (127.0.0.1) port bindings
#
# SECURITY: Prevents accidental exposure of services to public internet in production
#
# Usage:
#   ./scripts/check-port-bindings.sh              # Check all production files
#   ./scripts/check-port-bindings.sh <file>       # Check specific file
#
# Related: 10N-166 - Module 1 LOW - Open ports on all interfaces

set -euo pipefail

# ANSI color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Production file patterns that MUST use localhost bindings
readonly PROD_PATTERNS=(
  "infrastructure/digitalocean/*.yml"
  "infrastructure/aws/*.yml"
  "**/prod.yml"
  "**/*-prod.yml"
  "**/production.yml"
  "**/*-production.yml"
)

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_VIOLATION=1
readonly EXIT_ERROR=2

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [FILE...]

Validates Docker Compose port bindings for security compliance.

OPTIONS:
  -h, --help     Show this help message
  -v, --verbose  Verbose output

EXAMPLES:
  # Check all production files
  $(basename "$0")

  # Check specific file
  $(basename "$0") infrastructure/digitalocean/docker-compose.prod.yml

  # Verbose mode
  $(basename "$0") -v

SECURITY POLICY:
  Production files MUST use 127.0.0.1: prefix for all port bindings
  Example: "127.0.0.1:8080:80" (correct) vs "8080:80" (VIOLATION)

EXIT CODES:
  0 - All checks passed
  1 - Port binding violations found
  2 - Script error or invalid arguments

EOF
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
  echo -e "${GREEN}✓${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
  echo -e "${RED}✗${NC} $*" >&2
}

check_file() {
  local file="$1"
  local violations=0
  local line_num=0

  if [[ ! -f "$file" ]]; then
    log_error "File not found: $file"
    return "$EXIT_ERROR"
  fi

  log_info "Checking: $file"

  # Parse YAML for port bindings (supports both string and array formats)
  # Matches patterns like:
  #   - "8080:80"           # VIOLATION (implicit 0.0.0.0)
  #   - "0.0.0.0:8080:80"   # VIOLATION (explicit 0.0.0.0)
  #   - "127.0.0.1:8080:80" # CORRECT (localhost-only)

  while IFS= read -r line; do
    ((line_num++))

    # Skip comments and empty lines
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
      continue
    fi

    # Match port binding patterns in YAML array format (short syntax)
    # Supports multiple formats:
    #   - "8080:80"                # quoted
    #   - 8080:80                  # unquoted
    #   - "127.0.0.1:8080:80"      # IPv4 with host IP
    #   - "[::1]:8080:80"          # IPv6 with brackets (required by YAML)
    #   - "8080:80/tcp"            # with protocol
    #
    # Pattern explanation:
    # - Array item starts with dash and spaces
    # - Optional quotes (double or single)
    # - Optional bracketed IPv6 OR IPv4/port combo
    # - Colon-separated port binding
    # - Optional protocol suffix (/tcp, /udp)
    # - Optional trailing quote
    if [[ "$line" =~ -[[:space:]]+[\"']?(\[[:0-9a-fA-F]+\]:[0-9]+(:[0-9]+)?(/[a-z]+)?|[0-9.:]+:[0-9]+(/[a-z]+)?)[\"']? ]]; then
      local port_binding="${BASH_REMATCH[1]}"

      # Check if binding starts with 127.0.0.1: or [::1]: (IPv4/IPv6 localhost)
      # Note: IPv6 MUST use brackets in YAML: [::1]:8080:80
      if [[ ! "$port_binding" =~ ^(127\.0\.0\.1|\[::1\]): ]]; then
        log_error "  Line $line_num: $port_binding"
        log_error "    → Must use localhost binding: 127.0.0.1:PORT:CONTAINER or [::1]:PORT:CONTAINER"
        ((violations++))
      else
        [[ "${VERBOSE:-}" == "1" ]] && log_success "  Line $line_num: $port_binding (correct)"
      fi
    fi
  done < "$file"

  if [[ "$violations" -eq 0 ]]; then
    log_success "No violations found in $file"
    return "$EXIT_SUCCESS"
  else
    log_error "Found $violations violation(s) in $file"
    return "$EXIT_VIOLATION"
  fi
}

find_production_files() {
  local files=()

  for pattern in "${PROD_PATTERNS[@]}"; do
    # Recursive only if the pattern STARTS with literal "**/"
    if [[ "$pattern" == \*\*/* ]]; then
      # Remove the leading "**/" literally
      local basename="${pattern#\*\*/}"
      while IFS= read -r -d '' file; do
        files+=("$file")
      done < <(find . -type f -name "$basename" -print0 2>/dev/null || true)

    # Non-recursive: directory + wildcard in basename (e.g., path/*.yml)
    elif [[ "$pattern" == */* && "$pattern" == *\** ]]; then
      local dir="${pattern%/*}"
      local filepattern="${pattern##*/}"
      while IFS= read -r -d '' file; do
        files+=("$file")
      done < <(find "$dir" -maxdepth 1 -type f -name "$filepattern" -print0 2>/dev/null || true)

    else
      # Literal file or simple glob via find -path so the shell doesn't expand it
      if [[ -f "$pattern" ]]; then
        files+=("$pattern")
      else
        while IFS= read -r -d '' file; do
          files+=("$file")
        done < <(find . -type f -path "./$pattern" -print0 2>/dev/null || true)
      fi
    fi
  done

  # De-dupe + sort
  if [[ ${#files[@]} -gt 0 ]]; then
    printf '%s\n' "${files[@]}" | sort -u
  fi
}

main() {
  local verbose=0
  local files_to_check=()
  local total_violations=0

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        usage
        exit "$EXIT_SUCCESS"
        ;;
      -v|--verbose)
        verbose=1
        VERBOSE=1
        shift
        ;;
      -*)
        log_error "Unknown option: $1"
        usage
        exit "$EXIT_ERROR"
        ;;
      *)
        files_to_check+=("$1")
        shift
        ;;
    esac
  done

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Docker Compose Port Binding Security Check${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # If no files specified, find all production files
  if [[ ${#files_to_check[@]} -eq 0 ]]; then
    log_info "Scanning for production Docker Compose files..."
    mapfile -t files_to_check < <(find_production_files)

    if [[ ${#files_to_check[@]} -eq 0 ]]; then
      log_warning "No production Docker Compose files found"
      exit "$EXIT_SUCCESS"
    fi

    log_info "Found ${#files_to_check[@]} production file(s)"
    echo ""
  fi

  # Check each file
  for file in "${files_to_check[@]}"; do
    if ! check_file "$file"; then
      ((total_violations++))
    fi
    echo ""
  done

  # Summary
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if [[ "$total_violations" -eq 0 ]]; then
    log_success "All production files use secure localhost-only bindings"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit "$EXIT_SUCCESS"
  else
    log_error "Found violations in $total_violations file(s)"
    log_error "Production services MUST use 127.0.0.1: prefix"
    echo ""
    log_info "To fix: Replace '8080:80' with '127.0.0.1:8080:80'"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit "$EXIT_VIOLATION"
  fi
}

main "$@"
