#!/usr/bin/env bash
set -euo pipefail

# Pure-bash test runner (bats alternative)
cd "$(git rev-parse --show-toplevel)"

echo "Testing find_production_files..."

# Expected files (sorted)
expected=$'./infrastructure/digitalocean/docker-compose.monitoring.prod.yml
./infrastructure/digitalocean/docker-compose.prod.yml
./infrastructure/monitoring/local/prometheus.prod.yml
./infrastructure/monitoring/production/prometheus.prod.yml'

# Run the function
# shellcheck source=/dev/null
source scripts/check-port-bindings.sh
actual=$(find_production_files)

# Sort both for comparison
expected_sorted=$(printf "%s\n" "$expected" | sort -u)
actual_sorted=$(printf "%s\n" "$actual" | sort -u)

# Compare
if diff -u <(echo "$expected_sorted") <(echo "$actual_sorted"); then
  echo "✓ Test passed: All 4 expected production files found"
  exit 0
else
  echo "✗ Test failed: Output mismatch"
  echo
  echo "Expected:"
  echo "$expected_sorted"
  echo
  echo "Actual:"
  echo "$actual_sorted"
  exit 1
fi

