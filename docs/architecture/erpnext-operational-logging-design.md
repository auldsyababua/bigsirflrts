# ERPNext Operational Logging & Analytics Design

**Status:** PROPOSED **Created:** 2025-10-06 **Related Linear Issue:** 10N-253
**Parent Epic:** 10N-233 (Refactor Docs & Tickets for Frappe Cloud Migration)

## Executive Summary

This document defines the ERPNext data model and architecture for operational
logging and analytics, replacing Supabase tables previously used for FLRTS task
tracking, Telegram event logging, and NLP parsing metrics. This design supports
the migration to Frappe Cloud managed infrastructure per ADR-006 and unblocks
implementation work for external webhook handlers and sync services.

**Key Decisions:**

- Introduce 3 new DocTypes in Operational Services module: Task Sync Log,
  Telegram Webhook Event, NLP Parsing Log
- Implement scheduled archiving job with 90/180-day retention policies
- Use ERPNext native dashboards and Frappe Charts for analytics
- Leverage ERPNext Version DocType for audit logging (no custom audit table)

## Context & Motivation

### Current State

- Supabase PostgreSQL tables store operational logs for Telegram webhooks, task
  synchronization, and NLP parsing events
- ERPNext currently runs in "guard mode" (10N-243) with no DocTypes for these
  data flows
- External workers (Telegram handler, n8n workflows) depend on Supabase for
  event tracking and analytics
- Logging/analytics strategy undefined beyond decision to use native Frappe
  Cloud tooling

### Goals

1. Define ERPNext storage targets for operational logging (replacing Supabase
   tables)
2. Preserve queryability and analytics capabilities for operational metrics
3. Implement retention policies with automated archiving to manage storage costs
4. Enable dashboard/reporting for task sync status, webhook events, and NLP
   performance

### Constraints

- **Max DB connection = 1** (Frappe Cloud private bench limit): External workers
  must use REST API, not direct DB access
- **SSL required** for DB connections with CA cert
  (n1-virginia.frappe.cloud.pem)
- **Redis managed internally** by Frappe Cloud; no direct access needed
- **No historical data migration** required for MVP (start fresh with ERPNext
  DocTypes)

## Supabase → ERPNext Mapping

### 1. Task Sync Logging

#### Supabase: `tasks` table (sync cache)

Stores cached OpenProject task data with sync metadata.

**Key fields:**

- `openproject_id` (INTEGER, unique) – External ticket identifier
- `owner_id`, `assignee_id` (UUID FK) – Personnel references
- `status`, `priority` (TEXT/INT) – Task state
- `synced_at` (TIMESTAMPTZ) – Last sync timestamp
- `metadata` (JSONB) – Additional sync context

#### ERPNext: **Task Sync Log** DocType

**Module:** Operational Services **Naming Series:** TSL-.YYYY.-#####
**Purpose:** Track synchronization operations between ERPNext and external
ticketing systems (OpenProject, GitHub, Linear)

**Parent Fields:**

| Field Name            | Type         | Label               | Required | Index | Description                                |
| --------------------- | ------------ | ------------------- | -------- | ----- | ------------------------------------------ |
| `external_ticket_id`  | Data         | External Ticket ID  | ✓        | ✓     | Maps to Supabase `openproject_id`          |
| `source_system`       | Select       | Source System       | ✓        | ✓     | Options: OpenProject, GitHub, Linear       |
| `sync_direction`      | Select       | Sync Direction      | ✓        | -     | Options: Import, Export, Bidirectional     |
| `status`              | Select       | Sync Status         | ✓        | ✓     | Options: Pending, Success, Failed, Partial |
| `last_sync_timestamp` | Datetime     | Last Sync At        | -        | -     | Maps to Supabase `synced_at`               |
| `last_sync_message`   | Small Text   | Last Sync Message   | -        | -     | Status/error summary                       |
| `related_erpnext_doc` | Dynamic Link | Related ERPNext Doc | -        | -     | Link to Work Order/Maintenance Visit       |
| `sync_metadata`       | Code (JSON)  | Sync Metadata       | -        | -     | Maps to Supabase `metadata` field          |

**Child Table: Task Sync Attempt** Attached via Table MultiSelect field
`sync_attempts`

| Field Name          | Type        | Label             | Description                       |
| ------------------- | ----------- | ----------------- | --------------------------------- |
| `attempt_timestamp` | Datetime    | Attempt Timestamp | When sync attempt occurred        |
| `attempt_status`    | Select      | Attempt Status    | Options: Success, Failed, Timeout |
| `http_status_code`  | Int         | HTTP Status Code  | API response code                 |
| `request_payload`   | Code (JSON) | Request Payload   | Outgoing request data             |
| `response_payload`  | Code (JSON) | Response Payload  | API response data                 |
| `error_log`         | Text        | Error Log         | Stack trace or error message      |

---

### 2. Telegram Webhook Logging

#### Supabase: `telegram_webhook_logs` (inferred)

Stores incoming Telegram webhook events with processing metadata. Table not
present in repo migrations but referenced in Linear issue and planning docs.

**Key fields:**

- `event_id` (TEXT, unique) – Event identifier (UUID/hash)
- `telegram_update_id` (BIGINT) – Telegram API update ID
- `chat_id` (BIGINT) – Telegram chat identifier
- `received_at` (TIMESTAMPTZ) – Event arrival timestamp
- `processing_status` (TEXT) – Processing state
- `handler_function` (TEXT) – Handler module/function path
- `raw_payload` (JSONB) – Full webhook payload

#### ERPNext: **Telegram Webhook Event** DocType

**Module:** Operational Services **Naming Series:** TWE-.YYYY.-#####
**Purpose:** Log and track incoming Telegram webhook events for audit,
debugging, and analytics

**Parent Fields:**

| Field Name           | Type       | Label              | Required | Index      | Description                                     |
| -------------------- | ---------- | ------------------ | -------- | ---------- | ----------------------------------------------- |
| `event_id`           | Data       | Event ID           | ✓        | ✓ (Unique) | UUID or hash of webhook payload                 |
| `telegram_update_id` | Int        | Telegram Update ID | ✓        | ✓          | From Telegram Bot API                           |
| `chat_id`            | Int        | Chat ID            | ✓        | ✓          | Telegram chat identifier                        |
| `received_at`        | Datetime   | Received At        | ✓        | ✓          | Webhook arrival time                            |
| `processing_status`  | Select     | Processing Status  | ✓        | ✓          | Options: Pending, Processing, Completed, Failed |
| `error_message`      | Small Text | Error Message      | -        | -          | Error details if failed                         |
| `handler_function`   | Data       | Handler Function   | -        | -          | Python function/module path                     |
| `retry_count`        | Int        | Retry Count        | -        | -          | Number of processing attempts                   |
| `last_retry_at`      | Datetime   | Last Retry At      | -        | -          | Last retry timestamp                            |

**Child Table: Webhook Event Payload** Attached via Table MultiSelect field
`payload_history`

| Field Name           | Type      | Label                | Description                      |
| -------------------- | --------- | -------------------- | -------------------------------- |
| `storage_timestamp`  | Datetime  | Storage Timestamp    | When payload was captured        |
| `raw_payload`        | Long Text | Raw Payload          | JSON string of full webhook data |
| `payload_size_bytes` | Int       | Payload Size (Bytes) | Size of raw payload              |

---

### 3. NLP Parsing Logging

#### Supabase: `parsing_logs` (inferred)

Stores NLP parsing operation metadata and results. Table not present in repo
migrations but referenced in operational services documentation.

**Key fields:**

- `source_text_hash` (TEXT) – Hash of input text for deduplication
- `source_document_id` (UUID FK) – Link to originating document
- `status` (TEXT) – Parsing outcome
- `parser_version` (TEXT) – Model/parser version identifier
- `processing_time_ms` (INTEGER) – Latency metric
- `confidence_score` (FLOAT) – Overall parsing confidence
- `parsed_entities` (JSONB) – Extracted entities with positions

#### ERPNext: **NLP Parsing Log** DocType

**Module:** Operational Services **Naming Series:** NLPL-.YYYY.-#####
**Purpose:** Track NLP parsing operations for performance analysis, debugging,
and model evaluation

**Parent Fields:**

| Field Name            | Type         | Label                | Required | Index | Description                                    |
| --------------------- | ------------ | -------------------- | -------- | ----- | ---------------------------------------------- |
| `source_text_hash`    | Data         | Source Text Hash     | ✓        | ✓     | SHA256 of input text for deduplication         |
| `source_document`     | Dynamic Link | Source Document      | -        | -     | Link to originating DocType                    |
| `status`              | Select       | Parsing Status       | ✓        | ✓     | Options: Pending, Success, Failed, Partial     |
| `parser_version`      | Data         | Parser Version       | -        | -     | Model version identifier (e.g., gpt-4-0125)    |
| `processing_time_ms`  | Int          | Processing Time (ms) | -        | -     | Duration of parsing operation                  |
| `error_details`       | Text         | Error Details        | -        | -     | Error message/stack trace                      |
| `confidence_score`    | Float        | Confidence Score     | -        | -     | 0.0-1.0 overall confidence                     |
| `source_text_preview` | Small Text   | Source Text Preview  | -        | -     | First 200 chars of input (for quick reference) |

**Child Table: NLP Parsing Result** Attached via Table MultiSelect field
`parsed_entities`

| Field Name       | Type  | Label          | Description                             |
| ---------------- | ----- | -------------- | --------------------------------------- |
| `entity_type`    | Data  | Entity Type    | e.g., PERSON, DATE, LOCATION, EQUIPMENT |
| `entity_value`   | Data  | Entity Value   | Extracted text value                    |
| `start_position` | Int   | Start Position | Character offset in source text         |
| `end_position`   | Int   | End Position   | Character offset in source text         |
| `confidence`     | Float | Confidence     | 0.0-1.0 confidence for this entity      |

---

### 4. Audit Logging Strategy

#### Supabase: `audit_logs` table

Generic audit log tracking all entity changes across FLRTS application.

**Key fields:**

- `user_id` (UUID FK) – User who performed action
- `action` (TEXT) – Action type (create, update, delete)
- `entity_type`, `entity_id` (TEXT, UUID) – Target entity
- `old_values`, `new_values` (JSONB) – State change
- `ip_address` (INET), `user_agent` (TEXT) – Client metadata

#### ERPNext Strategy: **Native Version Control + Custom Hooks**

**Decision:** Use ERPNext's built-in `Version` DocType for standard audit
logging. No custom audit table required for MVP.

**Rationale:**

- ERPNext automatically tracks all DocType changes via Version DocType
- Version records capture user, timestamp, old/new values (JSON diff)
- Custom audit needs (IP address, user agent) can be added via Server Script
  hooks on `on_update` event
- Reduces implementation complexity and leverages platform features

**Custom Audit Event DocType (Optional):** Only create if specific use cases
emerge requiring metadata not captured by Version (e.g., bulk operations, API
calls without DocType changes).

**Fields (if implemented):**

- `user` (Link to User)
- `action` (Data)
- `entity_type` (Data), `entity_name` (Data)
- `old_values` (Code JSON), `new_values` (Code JSON)
- `metadata` (Code JSON) – For IP, user agent, etc.
- `timestamp` (Datetime)

---

## Retention & Archiving

### Retention Policy

| DocType                | Hot Data Retention | Archive Strategy              |
| ---------------------- | ------------------ | ----------------------------- |
| Task Sync Log          | 90 days            | Export to JSON, purge from DB |
| Telegram Webhook Event | 90 days            | Export to JSON, purge from DB |
| NLP Parsing Log        | 180 days           | Export to JSON, purge from DB |

**Rationale:**

- Task Sync and Telegram events are high-volume operational logs with decreasing
  value over time
- NLP Parsing logs may be analyzed for model improvements over longer periods
- Archive exports enable compliance and historical analysis without database
  bloat

### Archiving Job Design

**Job Name:** `archive_operational_logs` **Location:**
`flrts_extensions/operational_services/archiving_job.py` **Cadence:** Daily at
02:00 UTC (scheduled via ERPNext Scheduler hooks)

**Implementation:**

```python
def archive_operational_logs():
    """
    Daily archiving job for operational logging DocTypes.
    Exports records older than retention threshold to JSON files,
    then deletes from database.
    """
    thresholds = {
        "Task Sync Log": 90,
        "Telegram Webhook Event": 90,
        "NLP Parsing Log": 180
    }

    for doctype, retention_days in thresholds.items():
        cutoff_date = add_days(today(), -retention_days)

        # Query expired records
        expired_records = frappe.get_all(
            doctype,
            filters={"created": ["<", cutoff_date]},
            fields=["name"]
        )

        if not expired_records:
            continue

        # Export to JSON file (includes child tables)
        export_path = f"/archive/{doctype.replace(' ', '_').lower()}_{today()}.json"
        export_records_to_json(doctype, expired_records, export_path)

        # Delete from database (cascade to child tables)
        for record in expired_records:
            frappe.delete_doc(doctype, record.name, force=True)

        frappe.db.commit()
        frappe.logger().info(f"Archived {len(expired_records)} {doctype} records")
```

**Scheduler Configuration (hooks.py):**

```python
scheduler_events = {
    "daily": [
        "flrts_extensions.operational_services.archiving_job.archive_operational_logs"
    ]
}
```

**Archive Storage:**

- **MVP:** Native Frappe File storage (File DocType attachments)
- **Future enhancement:** Cloudflare R2 bucket integration for scalable,
  cost-effective storage (trigger: archive size >10GB)

**Monitoring & Alerting:**

- Log archiving job status to ERPNext Error Log on failure
- Send email notification to admin on failure (ERPNext Notification)
- Create "Archiving Job Status" dashboard showing:
  - Last successful run timestamp
  - Records archived (last 7 days, by DocType)
  - Archive storage usage trend
  - Failure count (last 30 days)

**Effort Estimate:** 14 hours (job implementation + testing + monitoring)

---

## Dashboards & Reports

### Priority Dashboards

#### 1. Task Sync Status Overview

**Module:** Operational Services **Refresh:** Real-time + auto-refresh every 60s

**Charts:**

- **Sync Status Distribution** (Pie Chart): Success/Failed/Pending/Partial
  breakdown (last 24h)
- **Sync Activity Over Time** (Line Chart): Sync attempts per day (last 7 days)
- **Sync Errors by Source System** (Bar Chart): Failure count by
  OpenProject/GitHub/Linear (last 7 days)

**Number Cards:**

- Total syncs (last 24h)
- Success rate % (last 24h)
- Active failures requiring attention

**Query Example (Pie Chart):**

```python
frappe.db.get_all(
    "Task Sync Log",
    filters={"created": [">", add_days(today(), -1)]},
    fields=["status", "count(name) as count"],
    group_by="status"
)
```

---

#### 2. Telegram Event Analytics

**Module:** Operational Services **Refresh:** Auto-refresh every 30s

**Charts:**

- **Events per Hour** (Line Chart): Hourly webhook event volume (last 24h)
- **Processing Status Breakdown** (Donut Chart):
  Pending/Processing/Completed/Failed (last 24h)
- **Top Handlers by Volume** (Bar Chart): Most active handler functions (last 7
  days, top 10)

**Number Cards:**

- Total events (last 24h)
- Failed events (last 24h)
- Events with retries > 0

**Query Example (Events per Hour):**

```sql
SELECT
    DATE_FORMAT(received_at, '%Y-%m-%d %H:00:00') as hour,
    COUNT(*) as event_count
FROM `tabTelegram Webhook Event`
WHERE received_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour ASC
```

---

#### 3. NLP Parsing Performance

**Module:** Operational Services **Refresh:** Auto-refresh every 60s

**Charts:**

- **Parsing Latency Trend** (Line Chart): Avg/max/min latency over last 7 days
- **Parsing Success Rate** (Gauge Chart): Success % (last 24h) with 0-70% red,
  70-90% yellow, 90-100% green thresholds
- **Confidence Score Distribution** (Histogram): Count by confidence buckets
  (0.9-1.0, 0.8-0.9, etc.)

**Number Cards:**

- Total parses (last 24h)
- Failure count (last 24h)
- Avg confidence score (last 24h)
- Avg latency (last 24h)

**Query Example (Latency Trend):**

```sql
SELECT
    DATE(created) as date,
    AVG(processing_time_ms) as avg_latency,
    MAX(processing_time_ms) as max_latency,
    MIN(processing_time_ms) as min_latency
FROM `tabNLP Parsing Log`
WHERE created >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND status = 'Success'
GROUP BY date
ORDER BY date ASC
```

---

### Reports

#### 1. Task Sync Error Summary (Script Report)

**Filters:** Date Range (required), Source System (optional), Status (default:
Failed)

**Columns:**

- External Ticket ID
- Source System
- Status
- Last Sync Timestamp
- Error Message
- Sync Attempts Count
- Latest Error Log (from child table)

**Use Case:** Troubleshoot failed sync operations, identify patterns in external
API errors

---

#### 2. Telegram Event Processing Audit (Query Report)

**Filters:** Date Range (required), Chat ID (optional), Processing Status
(optional)

**Columns:**

- Event ID
- Telegram Update ID
- Chat ID
- Received At
- Processing Status
- Handler Function
- Retry Count
- Error Message

**Use Case:** Audit webhook processing for compliance, debug failed events

---

#### 3. NLP Parsing Performance Analysis (Script Report)

**Filters:** Date Range (required), Parser Version (optional), Min Confidence
Score (optional, default 0.0)

**Columns:**

- Parser Version
- Total Parses
- Success Count
- Failure Count
- Success Rate %
- Avg Latency (ms)
- Avg Confidence Score

**Use Case:** Compare parser/model performance over time, validate model
upgrades

---

**Implementation Effort:** 18 hours (dashboards) + 10 hours (reports) = 28 hours
total

---

## Integration Architecture

### External Worker Access Pattern

**Constraint:** Max DB connection = 1 (Frappe Cloud limit)

**Solution:** All external workers (Telegram handler, n8n workflows, OpenAI
integration) MUST use ERPNext REST API exclusively. No direct database
connections permitted.

**API Access Flow:**

```
External Worker → HTTPS → ERPNext REST API → DocType CRUD
                                   ↓
                           MariaDB (1 connection managed by ERPNext)
```

**API Authentication:**

- Provision API keys per worker via ERPNext "API Access" settings
- Scope permissions to create/update operational logging DocTypes only
- Store keys in 1Password vault entry "BigSirFLRTS Production Credentials"

**Example API Call (Create Task Sync Log):**

```python
import requests

response = requests.post(
    "https://ops.10nz.tools/api/resource/Task Sync Log",
    headers={
        "Authorization": f"token {api_key}:{api_secret}",
        "Content-Type": "application/json"
    },
    json={
        "external_ticket_id": "OP-1234",
        "source_system": "OpenProject",
        "sync_direction": "Import",
        "status": "Success",
        "sync_metadata": json.dumps({"field_changes": ["status", "assignee"]})
    },
    verify=True  # SSL verification required
)
```

---

## Risks & Mitigations

### Critical Risks

| Risk                                                            | Impact | Mitigation                                                                                                         |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| **R5: External workers exceed max DB connection limit**         | High   | Enforce REST API-only access in documentation; add connection limit monitoring dashboard                           |
| **R7: DocType field mappings incomplete, causing data loss**    | High   | Conduct thorough review of Supabase→ERPNext mapping with stakeholders; validate with sample data before production |
| **R8: Retention policy conflicts with compliance requirements** | High   | Confirm regulatory requirements (GDPR, SOC2) with legal/compliance team before implementation                      |

### Important Risks

| Risk                                                       | Impact      | Mitigation                                                                                                    |
| ---------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| **R1: Archive job fails silently**                         | Medium-High | Implement alerting via ERPNext Notification; add monitoring dashboard for job health                          |
| **R6: Dashboard queries cause performance issues**         | Medium      | Add database indexes on filter fields; cache query results for 60 seconds; limit chart data points to 500 max |
| **R9: ERPNext API rate limits block high-volume webhooks** | Medium      | Implement request throttling in webhook handler; add retry logic with exponential backoff                     |

### Deferred Risks (Post-MVP)

- **R2:** File storage quota exhausted before R2 integration → Monitor usage;
  implement R2 proactively if archives exceed 5GB
- **R4:** Archive job runs during high-traffic period → Schedule at 02:00 UTC;
  add DB query timeout limits
- **R10:** Frappe Chart performance degrades with >10k data points → Implement
  data aggregation/sampling

---

## Open Questions

### Architecture

1. **Archive retention period:** How long should exported JSON files be
   retained? (Proposed: 2 years, then purge)
2. **Restore process:** Is automated restore capability required, or is manual
   CSV import sufficient?
3. **Queue migration:** Should `notification_queue` move to Redis (Frappe Cloud
   managed) or ERPNext DocType?

### Compliance

1. Are there GDPR/SOC2/regulatory requirements for log retention/deletion that
   differ from proposed 90/180-day policies?
2. Do archived logs need encryption at rest beyond standard Frappe Cloud/R2
   encryption?

### Performance

1. Are proposed indexes sufficient for anticipated query patterns and data
   volumes?
2. Should child tables have separate indexes, or rely on parent index?
3. Should we implement Redis caching for dashboard queries, or use ERPNext's
   built-in caching?

---

## Follow-Up Tickets

### Implementation (High Priority)

1. **10N-XXX: Create ERPNext DocTypes for Operational Logging** Estimate: 12
   hours | Dependencies: None

2. **10N-XXX: Implement ERPNext Archiving Job** Estimate: 14 hours |
   Dependencies: DocTypes created

3. **10N-XXX: Create Operational Logging Dashboards** Estimate: 18 hours |
   Dependencies: DocTypes created, sample data available

4. **10N-XXX: Implement Operational Logging Reports** Estimate: 10 hours |
   Dependencies: DocTypes created

### Infrastructure (Medium Priority)

5. **10N-XXX: Provision ERPNext API Keys for External Workers** Estimate: 4
   hours | Dependencies: DocTypes created

6. **10N-XXX: Configure ERPNext Permissions for Operational Services** Estimate:
   3 hours | Dependencies: DocTypes created

7. **10N-XXX: Add Connection Limit Monitoring** Estimate: 4 hours |
   Dependencies: None

### Enhancements (Low Priority)

8. **10N-XXX: Integrate Cloudflare R2 for Archive Storage** Estimate: 8 hours |
   Trigger: Archive storage >10GB

9. **10N-XXX: Archive Retrieval API** Estimate: 6 hours | Priority: P2

10. **10N-XXX: Real-Time Alerting for Operational Dashboards** Estimate: 4 hours
    | Dependencies: Dashboards created

---

## References

- **ADR-006:** docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md
- **Infrastructure setup:** docs/.scratch/infra/bigsirflrts-prod-setup.md
- **Naming standards:** docs/erpnext/ERPNext-Migration-Naming-Standards.md
- **PRD context:** docs/prd/README.md
- **Linear issue:** 10N-253 (Design ERPNext DocTypes for FLRTS Logging &
  Analytics)
- **Scratch workspace:** docs/.scratch/10n-253/ (observations, mapping,
  archiving design, dashboard specs, risks)

---

## Appendix: Summary Comparison Table

| Supabase Table          | ERPNext DocType          | Retention          | Child Table(s)        | Status          |
| ----------------------- | ------------------------ | ------------------ | --------------------- | --------------- |
| `tasks` (sync cache)    | Task Sync Log            | 90 days            | Task Sync Attempt     | Design complete |
| `telegram_webhook_logs` | Telegram Webhook Event   | 90 days            | Webhook Event Payload | Design complete |
| `parsing_logs`          | NLP Parsing Log          | 180 days           | NLP Parsing Result    | Design complete |
| `audit_logs`            | Native `Version` + hooks | Per ERPNext config | N/A                   | Design complete |
| `notification_queue`    | _(deferred)_             | N/A                | N/A                   | Out of scope    |
| `telegram_sessions`     | _(deferred)_             | N/A                | N/A                   | Out of scope    |
