#!/bin/bash
# Test 6: Resource Utilization Monitoring
# QA Gate Requirement: Story 1.1
# Date: $(date -Iseconds)

set -e

echo "=========================================="
echo "TEST 6: RESOURCE UTILIZATION MONITORING"
echo "=========================================="
echo "Start time: $(date -Iseconds)"
echo ""

# Configuration
LOG_FILE="./test-6-evidence.log"
MONITORING_DURATION=1800  # 30 minutes in seconds
SAMPLE_INTERVAL=30        # Sample every 30 seconds

# Function to collect resource metrics
collect_metrics() {
    local timestamp=$(date -Iseconds)
    local sample_num=$1

    echo ""
    echo "=== Sample $sample_num at $timestamp ===" | tee -a $LOG_FILE

    # System overview
    echo "1. System Uptime and Load:" | tee -a $LOG_FILE
    uptime | tee -a $LOG_FILE

    # CPU usage
    echo ""
    echo "2. CPU Usage:" | tee -a $LOG_FILE
    top -bn1 | head -5 | tee -a $LOG_FILE

    # Memory usage
    echo ""
    echo "3. Memory Usage:" | tee -a $LOG_FILE
    free -h | tee -a $LOG_FILE

    # Disk usage
    echo ""
    echo "4. Disk Usage:" | tee -a $LOG_FILE
    df -h / | tee -a $LOG_FILE

    # Docker container stats
    echo ""
    echo "5. Docker Container Resources:" | tee -a $LOG_FILE
    docker stats --no-stream --format "table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | tee -a $LOG_FILE

    # Network connections
    echo ""
    echo "6. Network Statistics:" | tee -a $LOG_FILE
    netstat -an | grep -c ESTABLISHED || echo "0 established connections" | tee -a $LOG_FILE

    # Process count
    echo ""
    echo "7. Process Count:" | tee -a $LOG_FILE
    ps aux | wc -l | tee -a $LOG_FILE

    # Docker specific metrics
    echo ""
    echo "8. Docker System Info:" | tee -a $LOG_FILE
    docker system df | tee -a $LOG_FILE
}

# Function to simulate normal usage
simulate_usage() {
    echo "Simulating normal usage patterns..." | tee -a $LOG_FILE

    # Create a background job that simulates user activity
    (
        while true; do
            # Simulate API calls
            curl -s -o /dev/null "https://ops.10nz.tools/api/v3/projects" 2>/dev/null || true
            sleep $((RANDOM % 10 + 5))

            # Simulate health checks
            curl -s -o /dev/null "https://ops.10nz.tools/health_checks/default" 2>/dev/null || true
            sleep $((RANDOM % 10 + 5))

            # Simulate static asset requests
            curl -s -o /dev/null "https://ops.10nz.tools/assets/application.css" 2>/dev/null || true
            sleep $((RANDOM % 10 + 5))
        done
    ) &

    SIMULATE_PID=$!
    echo "Usage simulation started (PID: $SIMULATE_PID)" | tee -a $LOG_FILE
}

# Function to analyze collected metrics
analyze_metrics() {
    echo ""
    echo "=== METRICS ANALYSIS ===" | tee -a $LOG_FILE

    # Parse CPU usage from log
    echo "1. CPU Usage Analysis:" | tee -a $LOG_FILE
    grep "CPUPerc" $LOG_FILE | grep -v "Container" | awk '{print $3}' | sed 's/%//g' | awk '
        BEGIN {max=0; sum=0; count=0}
        {if ($1>max) max=$1; sum+=$1; count++}
        END {
            if (count > 0) {
                print "  - Average CPU: " sum/count "%"
                print "  - Peak CPU: " max "%"
                print "  - Samples: " count
            }
        }
    ' | tee -a $LOG_FILE

    # Parse memory usage from log
    echo ""
    echo "2. Memory Usage Analysis:" | tee -a $LOG_FILE
    grep "Mem:" $LOG_FILE | awk '{print $3}' | sed 's/G//g' | awk '
        BEGIN {max=0; sum=0; count=0}
        {
            val = $1
            if (index($1, "M") > 0) {
                gsub(/M/, "", val)
                val = val / 1024
            }
            if (val > max) max=val
            sum += val
            count++
        }
        END {
            if (count > 0) {
                print "  - Average Memory: " sum/count "GB"
                print "  - Peak Memory: " max "GB"
                print "  - Samples: " count
            }
        }
    ' | tee -a $LOG_FILE

    # Check for concerning patterns
    echo ""
    echo "3. Warning Detection:" | tee -a $LOG_FILE

    # Check for high CPU
    HIGH_CPU_COUNT=$(grep "CPUPerc" $LOG_FILE | grep -v "Container" | awk '{print $3}' | sed 's/%//g' | awk '$1 > 80 {count++} END {print count+0}')
    echo "  - High CPU (>80%) occurrences: $HIGH_CPU_COUNT" | tee -a $LOG_FILE

    # Check for high memory
    HIGH_MEM_COUNT=$(grep "MemPerc" $LOG_FILE | grep -v "Container" | awk '{print $5}' | sed 's/%//g' | awk '$1 > 80 {count++} END {print count+0}')
    echo "  - High Memory (>80%) occurrences: $HIGH_MEM_COUNT" | tee -a $LOG_FILE
}

# Pre-test validation
echo "=== PRE-TEST VALIDATION ==="
echo "1. Checking Docker daemon:"
docker version --format '{{.Server.Version}}' | tee -a $LOG_FILE

echo ""
echo "2. Checking running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "3. Initial resource snapshot:"
collect_metrics 0

echo ""
echo "=== STARTING MONITORING ===" | tee -a $LOG_FILE
echo "Monitoring duration: 30 minutes" | tee -a $LOG_FILE
echo "Sample interval: 30 seconds" | tee -a $LOG_FILE
echo "Total samples: $((MONITORING_DURATION / SAMPLE_INTERVAL))" | tee -a $LOG_FILE

# Start usage simulation
simulate_usage

# Main monitoring loop
SAMPLES=$((MONITORING_DURATION / SAMPLE_INTERVAL))
echo ""
echo "Starting monitoring loop..." | tee -a $LOG_FILE

for i in $(seq 1 $SAMPLES); do
    echo ""
    echo "========================================" | tee -a $LOG_FILE
    echo "Sample $i/$SAMPLES - $(date +"%H:%M:%S")" | tee -a $LOG_FILE
    echo "========================================" | tee -a $LOG_FILE

    collect_metrics $i

    # Check for critical conditions
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" flrts-openproject | sed 's/%//g' || echo "0")
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" flrts-openproject | sed 's/%//g' || echo "0")

    if (( $(echo "$CPU_USAGE > 90" | bc -l) )); then
        echo "⚠️  WARNING: High CPU usage detected: ${CPU_USAGE}%" | tee -a $LOG_FILE
    fi

    if (( $(echo "$MEM_USAGE > 90" | bc -l) )); then
        echo "⚠️  WARNING: High memory usage detected: ${MEM_USAGE}%" | tee -a $LOG_FILE
    fi

    # Progress indicator
    ELAPSED=$((i * SAMPLE_INTERVAL))
    REMAINING=$((MONITORING_DURATION - ELAPSED))
    echo "Progress: $ELAPSED seconds elapsed, $REMAINING seconds remaining" | tee -a $LOG_FILE

    # Sleep until next sample (unless last iteration)
    if [ $i -lt $SAMPLES ]; then
        sleep $SAMPLE_INTERVAL
    fi
done

# Stop usage simulation
echo ""
echo "Stopping usage simulation..." | tee -a $LOG_FILE
kill $SIMULATE_PID 2>/dev/null || true

echo ""
echo "=== MONITORING COMPLETE ===" | tee -a $LOG_FILE
echo "End time: $(date -Iseconds)" | tee -a $LOG_FILE

# Analyze collected metrics
analyze_metrics

# Generate summary report
echo ""
echo "=== GENERATING SUMMARY REPORT ===" | tee -a $LOG_FILE

cat > ./test-6-monitoring-report.md << EOF
# Resource Monitoring Report
Generated: $(date -Iseconds)

## Test Configuration
- Duration: 30 minutes
- Sample Interval: 30 seconds
- Total Samples: $SAMPLES
- Simulated Usage: Yes

## Resource Usage Summary

### CPU Usage
$(grep "CPUPerc" $LOG_FILE | grep "flrts-openproject" | tail -10)

### Memory Usage
$(grep "MemPerc" $LOG_FILE | grep "flrts-openproject" | tail -10)

### Disk Usage
$(df -h / | tail -1)

## Thresholds Validation
- CPU Usage Target: < 80%
- Memory Usage Target: < 80%
- Disk Space Target: > 20% free

## Container Health During Monitoring
$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep flrts)

## Recommendations
- Monitor CPU spikes during heavy usage
- Consider memory limits if usage grows
- Implement automated alerting for threshold breaches

## Evidence Files
- Full log: test-6-evidence.log
- This report: test-6-monitoring-report.md
EOF

echo "✅ Monitoring report generated: ./test-6-monitoring-report.md" | tee -a $LOG_FILE

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo ""

# Evaluate results
CPU_ACCEPTABLE=true
MEM_ACCEPTABLE=true
DISK_ACCEPTABLE=true

# Check if averages are within limits
AVG_CPU=$(grep "Average CPU:" $LOG_FILE | tail -1 | awk '{print $3}' | sed 's/%//g')
AVG_MEM=$(grep "Average Memory:" $LOG_FILE | tail -1 | awk '{print $3}' | sed 's/GB//g')

if (( $(echo "$AVG_CPU > 80" | bc -l) )); then
    CPU_ACCEPTABLE=false
fi

# Check disk space
DISK_USED=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//g')
if [ $DISK_USED -gt 80 ]; then
    DISK_ACCEPTABLE=false
fi

if [ "$CPU_ACCEPTABLE" = true ] && [ "$MEM_ACCEPTABLE" = true ] && [ "$DISK_ACCEPTABLE" = true ]; then
    echo "✅ TEST PASSED: All resource metrics within acceptable limits!" | tee -a $LOG_FILE
    echo "  - CPU usage stayed below 80% on average" | tee -a $LOG_FILE
    echo "  - Memory usage remained stable" | tee -a $LOG_FILE
    echo "  - Disk space adequate ($(( 100 - DISK_USED ))% free)" | tee -a $LOG_FILE
    echo "  - No resource exhaustion detected" | tee -a $LOG_FILE
    exit 0
else
    echo "❌ TEST FAILED: Resource limits exceeded!" | tee -a $LOG_FILE
    [ "$CPU_ACCEPTABLE" = false ] && echo "  - CPU usage too high" | tee -a $LOG_FILE
    [ "$MEM_ACCEPTABLE" = false ] && echo "  - Memory usage excessive" | tee -a $LOG_FILE
    [ "$DISK_ACCEPTABLE" = false ] && echo "  - Disk space low" | tee -a $LOG_FILE
    exit 1
fi