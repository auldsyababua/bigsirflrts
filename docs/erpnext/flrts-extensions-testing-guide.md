/Users/colinaulds/Desktop/bigsirflrts/docs/erpnext/flrts-extensions-testing-guide.md

# FLRTS Extensions Testing Guide

This guide provides comprehensive instructions for testing the
`flrts_extensions` custom app locally before deployment and verifying
functionality after deployment to Frappe Cloud.

## 1. Local Testing Setup

### Prerequisites

- Frappe development environment (frappe_docker or local bench)
- flrts_extensions app installed on local site
- Test data fixtures

### Setup Local Test Site

```bash
# Create test site
bench new-site test.local --admin-password admin

# Install ERPNext
bench --site test.local install-app erpnext

# Install flrts_extensions
bench --site test.local install-app flrts_extensions

# Run migrations
bench --site test.local migrate
```

## 2. Unit Tests

### Test Structure

Create test files in `flrts_extensions/flrts_extensions/tests/`:

**test_flrts_parser_log.py:**

- Test validation: confidence_score range (0.0-1.0)
- Test validation: correction chain (is_correction requires original_log_id)
- Test validation: error state (error_occurred requires error_message)
- Test cost calculation: verify Server Script calculates correctly
- Test field defaults: verify default values applied

**test_flrts_user_preference.py:**

- Test uniqueness: one preference per user
- Test uniqueness: telegram_user_id must be unique
- Test validation: quiet hours end > start
- Test autoname: document name equals user field

**test_maintenance_visit_custom_fields.py:**

- Test custom fields exist on Maintenance Visit
- Test field types match specifications
- Test field defaults applied correctly
- Test read-only fields cannot be modified

### Running Unit Tests

```bash
# Run all tests
bench --site test.local run-tests --app flrts_extensions

# Run specific test file
bench --site test.local run-tests --app flrts_extensions --module flrts_extensions.tests.test_flrts_parser_log

# Run with coverage
bench --site test.local run-tests --app flrts_extensions --coverage
```

## 3. Integration Tests

### Test Scenarios

**Scenario 1: Create Parser Log with Cost Calculation**

1. Create FLRTS Parser Log document
2. Set model_name: "gpt-4o-2024-08-06"
3. Set prompt_tokens: 100
4. Set completion_tokens: 50
5. Save document
6. Verify estimated_cost_usd calculated: (100 _0.0000025) + (50_ 0.000010) =
   $0.00075

**Scenario 2: Create User Preference with Telegram Mapping**

1. Create FLRTS User Preference document
2. Set user: "<test@example.com>"
3. Set telegram_user_id: "123456789"
4. Set timezone: "America/Los_Angeles"
5. Save document
6. Verify document name equals user email
7. Attempt to create duplicate with same telegram_user_id
8. Verify validation error thrown

**Scenario 3: Create Maintenance Visit with Custom Fields**

1. Create Maintenance Visit document
2. Set standard fields (customer, maintenance_type, etc.)
3. Set custom_flrts_source: "telegram_bot"
4. Set custom_telegram_message_id: "12345"
5. Set custom_priority: "High"
6. Set custom_parse_confidence: 0.85
7. Save document
8. Verify all custom fields saved correctly

### Running Integration Tests

```bash
# Manual testing via ERPNext UI
bench --site test.local browse

# Navigate to FLRTS module
# Create test documents
# Verify behavior
```

## 4. REST API Testing

### Test API Endpoints

**Test 1: List FLRTS Parser Logs**

```bash
curl -X GET "http://test.local:8000/api/resource/FLRTS Parser Log" \
  -H "Authorization: token <api_key>:<api_secret>"
```

Expected: 200 OK with JSON array of logs

**Test 2: Create FLRTS Parser Log**

```bash
curl -X POST "http://test.local:8000/api/resource/FLRTS Parser Log" \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_message_id": "12345",
    "telegram_user_id": "67890",
    "telegram_chat_id": "11111",
    "original_message": "Test message",
    "model_name": "gpt-4o-2024-08-06",
    "prompt_version": "v1.0.0",
    "system_prompt": "Test prompt",
    "user_message": "Test message",
    "parsed_output": {"test": "data"},
    "model_rationale": "Test rationale",
    "confidence_score": 0.85,
    "prompt_tokens": 100,
    "completion_tokens": 50
  }'
```

Expected: 200 OK with created document, estimated_cost_usd calculated

**Test 3: Get FLRTS User Preference**

```bash
curl -X GET "http://test.local:8000/api/resource/FLRTS User Preference/test@example.com" \
  -H "Authorization: token <api_key>:<api_secret>"
```

Expected: 200 OK with user preference document

**Test 4: Create Maintenance Visit with Custom Fields**

```bash
curl -X POST "http://test.local:8000/api/resource/Maintenance Visit" \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "Test Customer",
    "maintenance_type": "Unscheduled",
    "completion_status": "Pending",
    "custom_flrts_source": "telegram_bot",
    "custom_telegram_message_id": "12345",
    "custom_priority": "High",
    "custom_parse_confidence": 0.85
  }'
```

Expected: 200 OK with created Maintenance Visit including custom fields

## 5. Lambda Integration Testing

### Test Lambda → ERPNext Flow

**Prerequisites:**

- Lambda deployed with updated code
- ERPNext API credentials configured in Lambda
- flrts_extensions app deployed to production

**Test Steps:**

1. Send test Telegram message
2. Verify Lambda receives webhook
3. Verify Lambda calls OpenAI
4. Verify Lambda creates Maintenance Visit
5. Verify Lambda logs to FLRTS Parser Log
6. Verify Telegram confirmation sent

**Verification Queries:**

```bash
# Check Parser Log created
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud console
frappe.db.get_list("FLRTS Parser Log", filters={"telegram_message_id": "12345"})
EOF

# Check Maintenance Visit created
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud console
frappe.db.get_list("Maintenance Visit", filters={"custom_telegram_message_id": "12345"})
EOF
```

## 6. Performance Testing

### Test Cost Calculation Performance

```python
import frappe
import time

# Create 100 parser logs
start = time.time()
for i in range(100):
    doc = frappe.get_doc({
        "doctype": "FLRTS Parser Log",
        "telegram_message_id": str(i),
        "telegram_user_id": "67890",
        "telegram_chat_id": "11111",
        "original_message": f"Test message {i}",
        "model_name": "gpt-4o-2024-08-06",
        "prompt_version": "v1.0.0",
        "system_prompt": "Test",
        "user_message": "Test",
        "parsed_output": {"test": "data"},
        "model_rationale": "Test",
        "confidence_score": 0.85,
        "prompt_tokens": 100,
        "completion_tokens": 50
    })
    doc.insert()
    frappe.db.commit()
end = time.time()

print(f"Created 100 logs in {end - start:.2f} seconds")
print(f"Average: {(end - start) / 100:.3f} seconds per log")
```

Target: <100ms per log creation (including cost calculation)

## 7. Error Handling Tests

### Test Invalid Data

**Test 1: Invalid Confidence Score**

```python
doc = frappe.get_doc({
    "doctype": "FLRTS Parser Log",
    "confidence_score": 1.5  # Invalid: > 1.0
})
try:
    doc.insert()
    assert False, "Should have thrown validation error"
except frappe.ValidationError:
    pass  # Expected
```

**Test 2: Correction Without Original**

```python
doc = frappe.get_doc({
    "doctype": "FLRTS Parser Log",
    "is_correction": 1,
    "original_log_id": None  # Invalid: correction requires original
})
try:
    doc.insert()
    assert False, "Should have thrown validation error"
except frappe.ValidationError:
    pass  # Expected
```

**Test 3: Duplicate Telegram User ID**

```python
# Create first preference
frappe.get_doc({
    "doctype": "FLRTS User Preference",
    "user": "user1@example.com",
    "telegram_user_id": "123456789"
}).insert()

# Attempt duplicate
try:
    frappe.get_doc({
        "doctype": "FLRTS User Preference",
        "user": "user2@example.com",
        "telegram_user_id": "123456789"  # Duplicate
    }).insert()
    assert False, "Should have thrown validation error"
except frappe.ValidationError:
    pass  # Expected
```

## 8. Regression Testing

### Test Checklist (Run Before Each Deployment)

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] REST API endpoints respond correctly
- [ ] Cost calculation works for all models
- [ ] Custom fields appear on Maintenance Visit
- [ ] User preferences enforce uniqueness
- [ ] Parser logs validate correctly
- [ ] Lambda integration creates records
- [ ] No errors in ERPNext error logs
- [ ] Performance meets targets (<100ms per operation)

## 9. Test Data Cleanup

### Clean Up Test Records

```bash
# Delete test parser logs
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud console
frappe.db.delete("FLRTS Parser Log", {"telegram_message_id": ["like", "test%"]})
frappe.db.commit()
EOF

# Delete test user preferences
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud console
frappe.db.delete("FLRTS User Preference", {"user": ["like", "test%"]})
frappe.db.commit()
EOF
```

## 10. Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test-flrts-extensions.yml`:

```yaml
name: Test FLRTS Extensions

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Frappe
        run: |
          # Install Frappe bench
          # Create test site
          # Install app

      - name: Run Tests
        run: |
          bench --site test.local run-tests --app flrts_extensions

      - name: Upload Coverage
        uses: codecov/codecov-action@v2
```

This ensures all tests run automatically on every commit.

Reference:
`docs/research/A Git-Centric Development and Deployment Strategy for Custom ERPNext Applications on Frappe Cloud.md`
(lines 554-716) for testing patterns.
