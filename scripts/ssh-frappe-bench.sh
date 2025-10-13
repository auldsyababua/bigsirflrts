#!/bin/bash
# SSH helper for running commands on Frappe Cloud bench
# Usage: ./scripts/ssh-frappe-bench.sh "bench version"
#        ./scripts/ssh-frappe-bench.sh "bench --site builder-rbt-sjk.v.frappe.cloud migrate"

set -euo pipefail

BENCH_USER="bench-27276-000002-f1-virginia"
BENCH_HOST="n1-virginia.frappe.cloud"
BENCH_PORT="2222"
BENCH_DIR="/home/frappe/frappe-bench"

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"command to run\""
    echo ""
    echo "Examples:"
    echo "  $0 \"bench version\""
    echo "  $0 \"bench --site builder-rbt-sjk.v.frappe.cloud list-apps\""
    echo "  $0 \"bench --site builder-rbt-sjk.v.frappe.cloud migrate\""
    echo ""
    echo "Note: Requires valid SSH certificate in ~/.ssh/id_rsa-cert.pub"
    echo "      Generate via Frappe Cloud dashboard (valid ~6 hours)"
    exit 1
fi

COMMAND="$1"

# Check if certificate exists
if [ ! -f ~/.ssh/id_rsa-cert.pub ]; then
    echo "Error: SSH certificate not found at ~/.ssh/id_rsa-cert.pub"
    echo ""
    echo "Generate a fresh certificate:"
    echo "1. Go to https://frappecloud.com"
    echo "2. Navigate to: Bench Groups → bench-27276-000002-f1-virginia → SSH Access"
    echo "3. Click 'Generate Certificate' and run the provided command"
    echo ""
    echo "See docs/auth/erpnext-access.md for details"
    exit 1
fi

# Run command via SSH with piped input
printf "cd %s\n%s\nexit\n" "$BENCH_DIR" "$COMMAND" | \
    ssh -tt "${BENCH_USER}@${BENCH_HOST}" -p "${BENCH_PORT}" 2>&1 | \
    grep -v "Pseudo-terminal will not be allocated" | \
    grep -v "Connection to.*closed" || true
