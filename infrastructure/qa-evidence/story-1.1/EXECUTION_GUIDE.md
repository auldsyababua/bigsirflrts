# Story 1.1 QA Gate Test Execution Guide

## Critical Pre-Execution Requirements

### VM Access Requirements
- SSH access to Digital Ocean VM: `165.227.216.172`
- Root or sudo privileges on VM
- Ability to reboot VM (for Test 2)

### Local Requirements
- Docker installed and running
- Apache Bench (ab) installed for load testing
- curl for API testing
- bash shell environment

## Test Execution Order (MANDATORY)

Tests MUST be executed in this exact order as specified by QA:

### Phase 1: Immediate Mandatory Tests

#### 1. Container Health Monitoring (test-1)
```bash
cd /root/infrastructure/qa-evidence/story-1.1
./test-1-container-health-monitoring.sh
```

**Expected Output:**
- Container killed and auto-restarted within 30 seconds
- Health check endpoint returns 200
- Full recovery logs captured

**Evidence Files:**
- test-1-evidence.log
- Container restart timestamps

#### 2. Database Persistence (test-2) - REQUIRES VM REBOOT
```bash
# Step 1: Create test data
./test-2-database-persistence.sh

# Step 2: Note the TEST_DATA_ID displayed
# Example: qa_test_1234567890

# Step 3: Reboot the VM
sudo reboot

# Step 4: Wait 60-90 seconds for VM to restart

# Step 5: SSH back into VM and run verification
ssh root@165.227.216.172
cd /root/infrastructure/qa-evidence/story-1.1
./test-2-verify.sh
```

**Expected Output:**
- Test data persisted across reboot
- Database auto-started
- No corruption warnings

**Evidence Files:**
- test-2-evidence.log
- Pre/post reboot database snapshots

#### 3. Database Error Handling (test-3)
```bash
./test-3-database-error-handling.sh
```

**Expected Output:**
- Clear error messages during DB outage
- Automatic reconnection within 60 seconds
- Graceful degradation demonstrated

**Evidence Files:**
- test-3-evidence.log
- Error messages and recovery logs

#### 4. Cloudflare Tunnel Recovery (test-4)
```bash
./test-4-cloudflare-tunnel-recovery.sh
```

**Expected Output:**
- HTTPS becomes inaccessible when tunnel stops
- Recovery within 30 seconds after restart
- Cloudflare headers verified

**Evidence Files:**
- test-4-evidence.log
- curl output showing failure and recovery

### Phase 2: Performance Validation Tests

#### 5. Load Testing (test-5)
```bash
# Install Apache Bench if needed
apt-get update && apt-get install -y apache2-utils

# Run load test
./test-5-load-testing.sh
```

**Expected Output:**
- 1000 requests completed
- Zero failed requests
- 95th percentile < 200ms

**Evidence Files:**
- test-5-evidence.log
- test-5-ab-results.txt
- test-5-performance-report.md

#### 6. Resource Monitoring (test-6)
```bash
# This test runs for 30 minutes
./test-6-resource-monitoring.sh

# Optional: Run resource monitor on VM during test
ssh root@165.227.216.172
./monitor-remote.sh
```

**Expected Output:**
- 30 minutes of monitoring data
- CPU < 80% average
- Memory < 80% average
- Disk space adequate

**Evidence Files:**
- test-6-evidence.log
- test-6-monitoring-report.md
- Resource graphs over time

### Phase 3: Integration Validation Tests

#### 7. Health Endpoints (test-7)
```bash
./test-7-health-endpoints.sh
```

**Expected Output:**
- All endpoints return HTTP 200
- Response content indicates healthy
- Stress test successful

**Evidence Files:**
- test-7-evidence.log
- test-7-health-report.md

## Automated Full Test Execution

To run all tests automatically (except VM reboot):

```bash
cd /root/infrastructure/qa-evidence/story-1.1
./RUN_ALL_TESTS.sh
```

This will:
1. Run pre-flight checks
2. Execute each test in order
3. Prompt for manual intervention at Test 2
4. Generate comprehensive summary report
5. Provide pass/fail determination

## Evidence Submission Checklist

After all tests complete, verify:

- [ ] All 7 test scripts executed
- [ ] All evidence.log files generated
- [ ] Performance reports created (test-5, test-6, test-7)
- [ ] test-summary.md shows all tests passed
- [ ] master-test-log.txt contains full execution history
- [ ] Screenshots/terminal output captured where required

## Troubleshooting Common Issues

### Test 1 Fails: Container doesn't restart
- Check Docker restart policy: `docker inspect flrts-openproject | grep -A5 RestartPolicy`
- Verify container health check configured
- Check Docker daemon is running

### Test 2 Fails: Data doesn't persist
- Verify PostgreSQL volume mounts
- Check volume driver is 'local' not 'tmpfs'
- Ensure proper shutdown before reboot

### Test 3 Fails: No clear error messages
- Check OpenProject logs during DB outage
- Verify error handling middleware configured
- Ensure connection pool settings correct

### Test 4 Fails: Tunnel doesn't recover
- Check Cloudflare token validity
- Verify tunnel container restart policy
- Check network connectivity

### Test 5 Fails: Response time > 200ms
- Check VM resource allocation
- Verify no other services consuming resources
- Consider performance tuning parameters

### Test 6 Fails: High resource usage
- Check for memory leaks
- Verify container resource limits
- Review application logs for errors

### Test 7 Fails: Health endpoints return errors
- Verify all services running
- Check database connectivity
- Review OpenProject configuration

## Retesting After Fixes

If any test fails:

1. Fix the identified issue
2. Re-run ONLY the failed test first
3. If it passes, re-run from the beginning of that test category
4. Update evidence files with new timestamps
5. Document fixes applied in test-summary.md

## QA Validation Requirements

QA will independently verify:
- All tests were executed (not simulated)
- Evidence shows real failures and recovery
- Timestamps prove actual execution
- All validation criteria met
- No shortcuts or happy path testing

## Critical Success Factors

- **REAL EXECUTION**: No simulation, all tests must be run on actual VM
- **COMPLETE EVIDENCE**: Every test must generate full logs with timestamps
- **EXACT CRITERIA**: Must meet specified thresholds (30s, 60s, 200ms, etc.)
- **NO SHORTCUTS**: Any detected simulation results in immediate rejection

## Support

For test execution issues:
1. Review this guide and README.md
2. Check individual test script comments
3. Verify VM and Docker status
4. Review QA gate requirements in original YAML

Remember: **NO HAPPY PATH TESTING** - Every test must demonstrate real failure and real recovery!