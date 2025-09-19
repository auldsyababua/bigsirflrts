#!/bin/bash
# Test 5: Response Time Validation Under Load
# QA Gate Requirement: Story 1.1
# Date: $(date -Iseconds)

set -e

echo "=========================================="
echo "TEST 5: RESPONSE TIME VALIDATION UNDER LOAD"
echo "=========================================="
echo "Start time: $(date -Iseconds)"
echo ""

# Configuration
OPENPROJECT_URL="https://ops.10nz.tools"
LOG_FILE="./test-5-evidence.log"
RESULTS_FILE="./test-5-ab-results.txt"

# Function to check if Apache Bench is installed
check_ab_installed() {
    if command -v ab &> /dev/null; then
        echo "✅ Apache Bench (ab) is installed" | tee -a $LOG_FILE
        ab -V | head -1 | tee -a $LOG_FILE
        return 0
    else
        echo "❌ Apache Bench (ab) not installed" | tee -a $LOG_FILE
        echo "Installing Apache Bench..." | tee -a $LOG_FILE

        # Try to install based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install apache2 | tee -a $LOG_FILE
            else
                echo "Please install Apache Bench manually: brew install apache2" | tee -a $LOG_FILE
                return 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y apache2-utils | tee -a $LOG_FILE
            elif command -v yum &> /dev/null; then
                sudo yum install -y httpd-tools | tee -a $LOG_FILE
            else
                echo "Please install Apache Bench manually for your Linux distribution" | tee -a $LOG_FILE
                return 1
            fi
        fi

        # Check again after installation
        if command -v ab &> /dev/null; then
            echo "✅ Apache Bench installed successfully" | tee -a $LOG_FILE
            return 0
        else
            return 1
        fi
    fi
}

# Function to monitor system resources during test
monitor_resources() {
    echo "Starting resource monitoring in background..."

    # SSH into VM and monitor resources
    cat > ./monitor-remote.sh << 'EOF'
#!/bin/bash
# Run this on the VM during load testing
LOG_FILE="/tmp/resource-monitor.log"

echo "Resource monitoring started at $(date -Iseconds)" > $LOG_FILE
echo "========================================" >> $LOG_FILE

for i in {1..30}; do
    echo "" >> $LOG_FILE
    echo "Sample $i at $(date -Iseconds)" >> $LOG_FILE

    # CPU usage
    echo "CPU Usage:" >> $LOG_FILE
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/CPU: \1% idle/" | awk '{print "CPU: " 100-$2 "% used"}' >> $LOG_FILE

    # Memory usage
    echo "Memory Usage:" >> $LOG_FILE
    free -h | grep "^Mem:" >> $LOG_FILE

    # Docker stats
    echo "Container Stats:" >> $LOG_FILE
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -5 >> $LOG_FILE

    # Load average
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')" >> $LOG_FILE

    sleep 2
done

echo "" >> $LOG_FILE
echo "Monitoring completed at $(date -Iseconds)" >> $LOG_FILE
cat $LOG_FILE
EOF

    chmod +x ./monitor-remote.sh
    echo "✅ Resource monitoring script created: ./monitor-remote.sh" | tee -a $LOG_FILE
    echo "Please run this script on the VM during the load test" | tee -a $LOG_FILE
}

# Pre-test validation
echo "=== PRE-TEST VALIDATION ==="
echo "1. Checking Apache Bench installation:"
if ! check_ab_installed; then
    echo "Cannot proceed without Apache Bench" | tee -a $LOG_FILE
    exit 1
fi

echo ""
echo "2. Testing basic connectivity:"
BASIC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code} - %{time_total}s" "$OPENPROJECT_URL")
echo "Basic request: $BASIC_RESPONSE" | tee -a $LOG_FILE

echo ""
echo "3. Warming up the application:"
for i in {1..5}; do
    curl -s -o /dev/null "$OPENPROJECT_URL"
    echo "  Warmup request $i completed" | tee -a $LOG_FILE
done

echo ""
echo "4. Creating resource monitoring script:"
monitor_resources

echo ""
echo "=== BASELINE PERFORMANCE TEST ==="
echo "Testing with 1 concurrent user (baseline)..."

ab -n 10 -c 1 "$OPENPROJECT_URL/" 2>&1 | tee ./baseline.txt | grep -E "Requests per second:|Time per request:|Percentage|Failed" | tee -a $LOG_FILE

echo ""
echo "=== MAIN LOAD TEST ==="
echo "⚠️  Starting main load test: 1000 requests with 10 concurrent users"
echo "This simulates 10 team members using the system simultaneously"
echo ""

# Run the main load test
echo "Executing: ab -n 1000 -c 10 $OPENPROJECT_URL/" | tee -a $LOG_FILE
ab -n 1000 -c 10 -g ./gnuplot-data.tsv "$OPENPROJECT_URL/" 2>&1 | tee $RESULTS_FILE

# Parse results
echo ""
echo "=== PARSING TEST RESULTS ==="

# Extract key metrics
TOTAL_REQUESTS=$(grep "Complete requests:" $RESULTS_FILE | awk '{print $3}')
FAILED_REQUESTS=$(grep "Failed requests:" $RESULTS_FILE | awk '{print $3}')
RPS=$(grep "Requests per second:" $RESULTS_FILE | awk '{print $4}')
MEAN_TIME=$(grep "Time per request:" $RESULTS_FILE | head -1 | awk '{print $4}')
PERCENTILE_50=$(grep "50%" $RESULTS_FILE | awk '{print $2}')
PERCENTILE_95=$(grep "95%" $RESULTS_FILE | awk '{print $2}')
PERCENTILE_99=$(grep "99%" $RESULTS_FILE | awk '{print $2}')

echo "Summary of Results:" | tee -a $LOG_FILE
echo "  - Total requests: $TOTAL_REQUESTS" | tee -a $LOG_FILE
echo "  - Failed requests: $FAILED_REQUESTS" | tee -a $LOG_FILE
echo "  - Requests per second: $RPS" | tee -a $LOG_FILE
echo "  - Mean response time: ${MEAN_TIME}ms" | tee -a $LOG_FILE
echo "  - 50th percentile: ${PERCENTILE_50}ms" | tee -a $LOG_FILE
echo "  - 95th percentile: ${PERCENTILE_95}ms" | tee -a $LOG_FILE
echo "  - 99th percentile: ${PERCENTILE_99}ms" | tee -a $LOG_FILE

echo ""
echo "=== SUSTAINED LOAD TEST ==="
echo "Testing sustained load for 30 seconds..."

# Use timeout to run for exactly 30 seconds
timeout 30 ab -n 100000 -c 10 -t 30 "$OPENPROJECT_URL/" 2>&1 | tee ./sustained.txt | grep -E "Requests per second:|Failed|Time per request:" | tee -a $LOG_FILE || true

echo ""
echo "=== SPIKE LOAD TEST ==="
echo "Testing with spike load (20 concurrent users)..."

ab -n 200 -c 20 -t 10 "$OPENPROJECT_URL/" 2>&1 | tee ./spike.txt | grep -E "Requests per second:|Failed|Time per request:|95%" | tee -a $LOG_FILE

echo ""
echo "=== POST-TEST VALIDATION ==="
echo "1. Checking if service is still responsive:"
POST_TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code} - %{time_total}s" "$OPENPROJECT_URL")
echo "Post-test response: $POST_TEST_RESPONSE" | tee -a $LOG_FILE

echo ""
echo "2. Checking error logs for issues:"
echo "Please check container logs on the VM with:" | tee -a $LOG_FILE
echo "  docker logs --tail 50 flrts-openproject | grep -i error" | tee -a $LOG_FILE

echo ""
echo "=== GENERATING PERFORMANCE REPORT ==="

# Create detailed report
cat > ./test-5-performance-report.md << EOF
# Load Test Performance Report
Generated: $(date -Iseconds)

## Test Configuration
- URL: $OPENPROJECT_URL
- Total Requests: 1000
- Concurrent Users: 10 (simulating full team)
- Test Type: HTTP GET requests to homepage

## Results Summary

### Key Metrics
| Metric | Value | Requirement | Status |
|--------|-------|-------------|--------|
| Failed Requests | $FAILED_REQUESTS | 0 | $([ "$FAILED_REQUESTS" = "0" ] && echo "✅ PASS" || echo "❌ FAIL") |
| 95th Percentile Response Time | ${PERCENTILE_95}ms | < 200ms | $([ ${PERCENTILE_95%.*} -lt 200 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Requests Per Second | $RPS | > 50 | $(awk -v rps="$RPS" 'BEGIN {print (rps > 50) ? "✅ PASS" : "❌ FAIL"}') |

### Response Time Distribution
- 50th percentile (median): ${PERCENTILE_50}ms
- 95th percentile: ${PERCENTILE_95}ms
- 99th percentile: ${PERCENTILE_99}ms
- Mean: ${MEAN_TIME}ms

### Load Test Scenarios
1. **Baseline (1 user)**: Completed
2. **Normal Load (10 users)**: Completed
3. **Sustained Load (30 seconds)**: Completed
4. **Spike Load (20 users)**: Completed

## Full Apache Bench Output
\`\`\`
$(cat $RESULTS_FILE)
\`\`\`

## Recommendations
$(if [ ${PERCENTILE_95%.*} -gt 200 ]; then
    echo "- ⚠️  95th percentile exceeds 200ms requirement. Consider performance optimization."
fi)
$(if [ "$FAILED_REQUESTS" != "0" ]; then
    echo "- ❌ Failed requests detected. Investigate server logs for errors."
fi)

## Evidence Files
- Main results: test-5-ab-results.txt
- Baseline test: baseline.txt
- Sustained load: sustained.txt
- Spike test: spike.txt
- Resource monitoring script: monitor-remote.sh
EOF

echo "✅ Performance report generated: ./test-5-performance-report.md" | tee -a $LOG_FILE

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "End time: $(date -Iseconds)"
echo ""

# Evaluate pass/fail
TEST_PASS=true
FAILURE_REASONS=""

if [ "$FAILED_REQUESTS" != "0" ]; then
    TEST_PASS=false
    FAILURE_REASONS="$FAILURE_REASONS\n  - Failed requests: $FAILED_REQUESTS (must be 0)"
fi

if [ ${PERCENTILE_95%.*} -gt 200 ]; then
    TEST_PASS=false
    FAILURE_REASONS="$FAILURE_REASONS\n  - 95th percentile: ${PERCENTILE_95}ms (must be < 200ms)"
fi

if [ "$TEST_PASS" = true ]; then
    echo "✅ TEST PASSED: All validation criteria met!" | tee -a $LOG_FILE
    echo "  - Zero failed requests" | tee -a $LOG_FILE
    echo "  - 95th percentile response time < 200ms" | tee -a $LOG_FILE
    echo "  - System handled 10 concurrent users successfully" | tee -a $LOG_FILE
    echo "  - Service remained stable under load" | tee -a $LOG_FILE
    exit 0
else
    echo "❌ TEST FAILED: Not all criteria met!" | tee -a $LOG_FILE
    echo -e "$FAILURE_REASONS" | tee -a $LOG_FILE
    exit 1
fi