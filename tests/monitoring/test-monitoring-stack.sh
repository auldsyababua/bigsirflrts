#!/bin/bash

# Comprehensive Test Suite for FLRTS Monitoring Stack
# Tests all monitoring services after deployment

set -e

# Configuration
SERVER_IP="${SERVER_IP:-165.227.216.172}"
DOMAIN="${DOMAIN:-10nz.tools}"
TIMEOUT=30

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         FLRTS Monitoring Stack Test Suite               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing ${test_name}... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"

    local status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url")
    [ "$status" = "$expected_status" ]
}

# Function to test service health on server
test_service_health() {
    local service_name="$1"
    ssh root@${SERVER_IP} "docker-compose -f /root/openproject/docker-compose.monitoring.prod.yml ps ${service_name} | grep -q 'Up'"
}

# Function to test metrics endpoint
test_metrics_endpoint() {
    local url="$1"
    curl -s --connect-timeout $TIMEOUT "$url" | grep -q "# HELP"
}

# Test 1: SSH Connectivity
echo -e "${YELLOW}=== Testing Infrastructure ===${NC}"
run_test "SSH connectivity to server" \
    "ssh -o ConnectTimeout=5 root@${SERVER_IP} 'echo test' | grep -q test"

# Test 2: Docker Services Health
echo -e "${YELLOW}=== Testing Container Health ===${NC}"

services=("prometheus" "grafana" "jaeger" "node-exporter" "cadvisor" "n8n-monitor")
for service in "${services[@]}"; do
    run_test "${service} container running" \
        "test_service_health ${service}"
done

# Test 3: Internal Service Connectivity
echo -e "${YELLOW}=== Testing Internal Connectivity ===${NC}"

# Test Prometheus internal connectivity
run_test "Prometheus internal API" \
    "ssh root@${SERVER_IP} 'curl -s http://localhost:9090/api/v1/status/config | grep -q \"global\"'"

# Test Grafana internal connectivity
run_test "Grafana internal API" \
    "ssh root@${SERVER_IP} 'curl -s http://localhost:3000/api/health | grep -q \"ok\"'"

# Test Jaeger internal connectivity
run_test "Jaeger internal API" \
    "ssh root@${SERVER_IP} 'curl -s http://localhost:16686/ | grep -q \"Jaeger\"'"

# Test 4: External HTTPS Access
echo -e "${YELLOW}=== Testing External HTTPS Access ===${NC}"

monitoring_urls=(
    "https://prometheus.monitoring.${DOMAIN}"
    "https://grafana.monitoring.${DOMAIN}"
    "https://jaeger.monitoring.${DOMAIN}"
    "https://n8n-monitor.monitoring.${DOMAIN}"
)

for url in "${monitoring_urls[@]}"; do
    service_name=$(echo "$url" | cut -d'.' -f1 | cut -d'/' -f3)
    run_test "${service_name} HTTPS access" \
        "test_http_endpoint '$url'"
done

# Test 5: Metrics Collection
echo -e "${YELLOW}=== Testing Metrics Collection ===${NC}"

# Test Prometheus metrics
run_test "Prometheus self-metrics" \
    "test_metrics_endpoint 'https://prometheus.monitoring.${DOMAIN}/metrics'"

# Test Node Exporter metrics via Prometheus
run_test "Node Exporter metrics collection" \
    "curl -s 'https://prometheus.monitoring.${DOMAIN}/api/v1/query?query=up{job=\"node-exporter\"}' | grep -q '\"value\":\[.*,\"1\"\]'"

# Test cAdvisor metrics via Prometheus
run_test "cAdvisor metrics collection" \
    "curl -s 'https://prometheus.monitoring.${DOMAIN}/api/v1/query?query=up{job=\"cadvisor\"}' | grep -q '\"value\":\[.*,\"1\"\]'"

# Test 6: Grafana Configuration
echo -e "${YELLOW}=== Testing Grafana Configuration ===${NC}"

# Test Grafana datasource
run_test "Grafana Prometheus datasource" \
    "curl -s -u admin:admin 'https://grafana.monitoring.${DOMAIN}/api/datasources' | grep -q 'prometheus'"

# Test Grafana health
run_test "Grafana health check" \
    "curl -s 'https://grafana.monitoring.${DOMAIN}/api/health' | grep -q 'ok'"

# Test 7: Resource Usage
echo -e "${YELLOW}=== Testing Resource Usage ===${NC}"

# Test memory usage is within limits
run_test "Memory usage under 90%" \
    "ssh root@${SERVER_IP} 'free | awk \"NR==2{printf \\\"%.0f\\\", \\$3/\\$2*100}\"' | awk '{exit (\$1 < 90) ? 0 : 1}'"

# Test disk usage is under 80%
run_test "Disk usage under 80%" \
    "ssh root@${SERVER_IP} 'df / | awk \"NR==2{print \\$5}\" | sed \"s/%//\"' | awk '{exit (\$1 < 80) ? 0 : 1}'"

# Test 8: Service Dependencies
echo -e "${YELLOW}=== Testing Service Dependencies ===${NC}"

# Test Grafana can reach Prometheus
run_test "Grafana → Prometheus connectivity" \
    "ssh root@${SERVER_IP} 'docker exec flrts-grafana curl -s http://prometheus:9090/api/v1/status/config | grep -q \"global\"'"

# Test Prometheus can scrape targets
run_test "Prometheus target discovery" \
    "curl -s 'https://prometheus.monitoring.${DOMAIN}/api/v1/targets' | grep -q '\"health\":\"up\"'"

# Test 9: Logging
echo -e "${YELLOW}=== Testing Logging ===${NC}"

# Test n8n-monitor logging
run_test "n8n-monitor log generation" \
    "ssh root@${SERVER_IP} 'ls -la /root/openproject/logs/n8n-monitor-*.log 2>/dev/null | wc -l' | awk '{exit (\$1 > 0) ? 0 : 1}'"

# Test Docker container logs
run_test "Container log accessibility" \
    "ssh root@${SERVER_IP} 'docker-compose -f /root/openproject/docker-compose.monitoring.prod.yml logs --tail=1 prometheus | wc -l' | awk '{exit (\$1 > 0) ? 0 : 1}'"

# Test 10: Performance
echo -e "${YELLOW}=== Testing Performance ===${NC}"

# Test Prometheus query performance
run_test "Prometheus query response time" \
    "time curl -s 'https://prometheus.monitoring.${DOMAIN}/api/v1/query?query=up' | grep -q '\"status\":\"success\"'"

# Test Grafana page load time
run_test "Grafana page load performance" \
    "time curl -s 'https://grafana.monitoring.${DOMAIN}/login' | grep -q 'Grafana'"

# Test 11: Security
echo -e "${YELLOW}=== Testing Security ===${NC}"

# Test that monitoring ports are not exposed publicly
run_test "Prometheus port not publicly exposed" \
    "! nc -z ${SERVER_IP} 9090"

run_test "Grafana port not publicly exposed" \
    "! nc -z ${SERVER_IP} 3000"

run_test "Jaeger port not publicly exposed" \
    "! nc -z ${SERVER_IP} 16686"

# Test HTTPS redirects
run_test "HTTP to HTTPS redirect" \
    "curl -s -o /dev/null -w '%{http_code}' 'http://grafana.monitoring.${DOMAIN}' | grep -E '^(301|302|308)$'"

# Test 12: Cloudflare Tunnel
echo -e "${YELLOW}=== Testing Cloudflare Tunnel ===${NC}"

# Test tunnel health
run_test "Cloudflare Tunnel health" \
    "ssh root@${SERVER_IP} 'docker-compose logs cloudflared --tail=10 | grep -q \"connection.*registered\"'"

# Test SSL certificate
run_test "SSL certificate validity" \
    "echo | openssl s_client -servername grafana.monitoring.${DOMAIN} -connect grafana.monitoring.${DOMAIN}:443 2>/dev/null | openssl x509 -noout -dates | grep -q 'notAfter'"

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Test Results                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Tests Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests Failed: ${TESTS_FAILED}${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Monitoring stack is healthy.${NC}"
    echo ""
    echo -e "${YELLOW}Monitoring URLs:${NC}"
    echo "  📊 Prometheus:  https://prometheus.monitoring.${DOMAIN}"
    echo "  📈 Grafana:     https://grafana.monitoring.${DOMAIN}"
    echo "  🔍 Jaeger:      https://jaeger.monitoring.${DOMAIN}"
    echo "  🔔 n8n Monitor: https://n8n-monitor.monitoring.${DOMAIN}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the services and try again.${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting commands:${NC}"
    echo "  ssh root@${SERVER_IP} 'docker-compose -f /root/openproject/docker-compose.monitoring.prod.yml ps'"
    echo "  ssh root@${SERVER_IP} 'docker-compose -f /root/openproject/docker-compose.monitoring.prod.yml logs'"
    echo "  ssh root@${SERVER_IP} 'docker stats'"
    exit 1
fi