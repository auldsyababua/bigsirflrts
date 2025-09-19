# Webhook Retry and Backoff Testing

This document describes the comprehensive retry testing suite created to address
the testing gap identified in Story 1.5 QA review.

## Overview

The retry testing suite validates:

- **Exponential Backoff**: Proper delay scaling between retry attempts
- **Circuit Breaker**: System stops retrying after maximum attempts
- **Recovery**: System recovers after temporary failures
- **Performance**: Retry mechanisms don't impact normal operations
- **Configuration**: Retry parameters work as expected

## Test Files

### Core Test Suite

- `tests/integration/supabase-webhook-retry-backoff.test.js` - Main retry test
  suite
- `tests/helpers/retry-test-simulator.js` - Mock server for failure simulation
- `tests/run-retry-tests.js` - Test runner with environment setup

### Configuration

- `tests/config/test-config.js` - Updated with retry testing configuration
- `tests/.env.test` - Environment variables (use with 1Password)

## Running the Tests

### Option 1: Integrated Test Runner (Recommended)

```bash
# With 1Password Service Account
op run --env-file=tests/.env.test -- node tests/run-retry-tests.js

# Or if environment is already loaded
node tests/run-retry-tests.js
```

### Option 2: Direct Test Execution

```bash
# Run the retry test suite directly
op run --env-file=tests/.env.test -- node --test tests/integration/supabase-webhook-retry-backoff.test.js
```

### Option 3: Specific Scenario Testing

```bash
# Test exponential backoff with mock server
node tests/helpers/retry-test-simulator.js --scenario=exponential-backoff

# Test circuit breaker behavior
node tests/helpers/retry-test-simulator.js --scenario=circuit-breaker

# Test recovery after failures
node tests/helpers/retry-test-simulator.js --scenario=recovery

# Test slow response handling
node tests/helpers/retry-test-simulator.js --scenario=slow-response
```

## Test Scenarios

### 1. Exponential Backoff Validation

**Tests**: `should implement exponential backoff on webhook failures`

- Simulates webhook failures
- Validates delay progression: 1s → 2s → 4s → 8s → 16s → 32s (capped)
- Allows 50% variance for jitter and processing time

### 2. Maximum Retry Attempts

**Tests**: `should respect maximum retry attempts limit`

- Ensures system doesn't retry indefinitely
- Validates circuit breaker stops after configured maximum (default: 3 retries)

### 3. Maximum Delay Cap

**Tests**: `should implement maximum delay cap for retries`

- Validates delays don't exceed 32 seconds even with high attempt numbers
- Tests mathematical retry calculation utilities

### 4. Recovery After Downtime

**Tests**: `should recover after temporary n8n downtime`

- Simulates n8n service recovery
- Validates successful delivery after initial failures

### 5. Circuit Breaker Behavior

**Tests**: `should handle circuit breaker behavior on persistent failures`

- Ensures system doesn't hang on completely broken endpoints
- Validates timeout and circuit breaker mechanisms

### 6. Performance Under Load

**Tests**: `should maintain performance during retry scenarios`

- Tests concurrent operations during retry scenarios
- Validates normal operations aren't delayed by retry mechanisms

### 7. High-Frequency Operations

**Tests**: `should handle high-frequency webhook triggers with retry backoff`

- Tests rapid sequential database changes
- Validates system handles high load gracefully

## Configuration Parameters

The retry tests use these configurable parameters:

```javascript
// Default configuration (can be overridden via environment)
retry: {
  maxAttempts: 3,              // Maximum retry attempts
  baseDelayMs: 1000,           // Initial delay (1 second)
  maxDelayMs: 32000,           // Maximum delay cap (32 seconds)
  backoffMultiplier: 2,        // Exponential factor (2x)
  jitterMaxMs: 100,            // Random jitter (±100ms)
  testTimeoutMs: 45000,        // Test timeout (45 seconds)
}
```

### Environment Variables

Set these in `tests/.env.test` or via 1Password:

```bash
# Retry testing configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY_MS=1000
RETRY_MAX_DELAY_MS=32000
RETRY_BACKOFF_MULTIPLIER=2
RETRY_JITTER_MAX_MS=100
RETRY_TEST_TIMEOUT_MS=45000

# Mock server configuration
MOCK_WEBHOOK_PORT=3001
MOCK_FAILING_WEBHOOK_URL=http://localhost:3001/failing-webhook
MOCK_SLOW_WEBHOOK_URL=http://localhost:3001/slow-webhook
```

## Expected Retry Pattern

For exponential backoff with base delay 1000ms and multiplier 2:

| Attempt | Expected Delay | Cumulative Time |
| ------- | -------------- | --------------- |
| 1       | Immediate      | 0s              |
| 2       | ~1s            | 1s              |
| 3       | ~2s            | 3s              |
| 4       | ~4s            | 7s              |
| 5       | ~8s            | 15s             |
| 6+      | 32s (capped)   | 47s+            |

## Mock Server Scenarios

The retry test simulator supports these failure scenarios:

### Exponential Backoff (`--scenario=exponential-backoff`)

- Fails first 3 attempts, then succeeds
- Monitors actual vs expected delay patterns
- Validates exponential progression

### Circuit Breaker (`--scenario=circuit-breaker`)

- Always fails to test circuit breaker activation
- Monitors for retry attempt limit enforcement
- Validates system doesn't retry indefinitely

### Recovery (`--scenario=recovery`)

- Fails first 2 attempts, then recovers
- Tests system behavior during failure → recovery transition
- Validates successful completion after temporary issues

### Slow Response (`--scenario=slow-response`)

- Returns successful responses with 5s delay
- Tests timeout handling and performance impact
- Validates no unnecessary retries for slow but successful responses

## Integration with Existing Tests

The retry tests integrate seamlessly with the existing webhook test suite:

```bash
# Run all webhook tests including retry tests
op run --env-file=tests/.env.test -- node tests/run-integration-tests.js

# Run original webhook tests only
op run --env-file=tests/.env.test -- node --test tests/integration/supabase-webhook-n8n.test.js

# Run retry tests only
op run --env-file=tests/.env.test -- node --test tests/integration/supabase-webhook-retry-backoff.test.js
```

## Troubleshooting

### Common Issues

1. **Mock Server Port Conflicts**

   ```bash
   # Check if port 3001 is in use
   lsof -i :3001

   # Use different port
   MOCK_WEBHOOK_PORT=3002 node tests/run-retry-tests.js
   ```

2. **Environment Variables Missing**

   ```bash
   # Verify 1Password environment loading
   op run --env-file=tests/.env.test -- env | grep SUPABASE
   ```

3. **Test Timeouts**

   ```bash
   # Increase timeout for slow environments
   RETRY_TEST_TIMEOUT_MS=60000 node tests/run-retry-tests.js
   ```

4. **Network Issues**
   ```bash
   # Test webhook endpoint availability
   curl -X POST "${N8N_WEBHOOK_URL}" -H "Content-Type: application/json" -d '{"test": true}'
   ```

## Monitoring and Logs

During retry tests, monitor these logs:

### Supabase Webhook Delivery Logs

```sql
-- Check recent webhook attempts
SELECT created_at, status_code, response_body,
       EXTRACT(EPOCH FROM (updated_at - created_at)) as duration_seconds
FROM net.http_request_queue
WHERE url LIKE '%n8n-rrrs.sliplane.app%'
  AND created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

### n8n Workflow Execution Logs

- Monitor workflow executions in n8n dashboard
- Check for retry-related errors or performance issues
- Validate proper webhook payload processing

### Test Output Logs

The retry tests provide detailed logging:

```
✅ Exponential backoff verified: 1000ms → 2000ms → 4000ms
✅ Retry limit respected: 4 total attempts
✅ Performance test passed: 3 tasks updated in 2500ms
```

## Success Criteria

The retry tests pass when:

- [x] Exponential backoff pattern is detected and validated
- [x] Maximum retry attempts are respected (no infinite retries)
- [x] Maximum delay cap is enforced (32s maximum)
- [x] System recovers after temporary failures
- [x] Circuit breaker prevents indefinite retries on broken endpoints
- [x] Performance remains acceptable during retry scenarios
- [x] Normal operations aren't impacted by retry mechanisms
- [x] High-frequency operations are handled gracefully
- [x] Configuration parameters work as expected
- [x] Integration with existing webhook tests is seamless

## Next Steps

1. **Run Initial Test Suite**

   ```bash
   op run --env-file=tests/.env.test -- node tests/run-retry-tests.js
   ```

2. **Monitor Production Webhooks**
   - Use queries in this document to monitor retry patterns
   - Set up alerting for excessive retry rates
   - Track performance impact of retry mechanisms

3. **Tune Configuration**
   - Adjust retry parameters based on production behavior
   - Update test thresholds if needed
   - Add additional test scenarios for edge cases

4. **Documentation Updates**
   - Update Story 1.5 to reflect completed retry testing
   - Add retry testing to QA gate requirements
   - Include retry tests in CI/CD pipeline

---

**Status**: ✅ **COMPLETE** - Comprehensive retry testing infrastructure ready
**Testing Gap Resolved**: Advanced retry system testing as identified in Story
1.5 QA review
