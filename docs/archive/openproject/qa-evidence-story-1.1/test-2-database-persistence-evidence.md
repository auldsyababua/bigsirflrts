# Test 2: Database Persistence Across VM Reboots

**Date**: 2025-09-16T22:26:00 UTC **Tester**: Dev Agent (Claude) **Test
Requirement**: MANDATORY QA Test - Create test data, reboot VM, verify data
persistence

## Test Execution

### Test Data Creation

```
=== CREATING TEST PROJECT DATA ===
Test project: QA-TEST-DB-PERSISTENCE-1758061578
INSERT 0 1
 id |               name                |          identifier           |                                       description
----+-----------------------------------+-------------------------------+-----------------------------------------------------------------------------------------
  1 | QA-TEST-DB-PERSISTENCE-1758061578 | qa-test-db-persist-1758061578 | Test project for database persistence validation - Created Tue Sep 16 15:26:18 PDT 2025
(1 row)
```

✅ **PASS**: Test project created with unique ID=1, timestamp=1758061578

### VM Reboot Execution

```
=== VERIFICATION BEFORE REBOOT ===
Test project created with ID=1, name=QA-TEST-DB-PERSISTENCE-1758061578
=== INITIATING VM REBOOT ===
VM will reboot in 5 seconds...
Connection to 165.227.216.172 closed by remote host.
```

✅ **EXECUTED**: VM reboot initiated successfully with `sudo reboot`

### VM Recovery Verification

```
=== WAITING FOR VM TO COME BACK ONLINE ===
PING 165.227.216.172 (165.227.216.172): 56 data bytes
64 bytes from 165.227.216.172: icmp_seq=0 ttl=47 time=89.213 ms
64 bytes from 165.227.216.172: icmp_seq=1 ttl=47 time=98.024 ms
64 bytes from 165.227.216.172: icmp_seq=2 ttl=47 time=91.632 ms
--- 165.227.216.172 ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
```

✅ **PASS**: VM came back online successfully

### Container Auto-Start Verification

```
=== POST-REBOOT VERIFICATION ===
Tue Sep 16 22:28:20 UTC 2025
=== CHECKING CONTAINER STATUS ===
NAMES                STATUS
openproject          Up About a minute
openproject-db       Up About a minute
memcached            Up About a minute
cloudflared-tunnel   Up About a minute
```

✅ **PASS**: All containers restarted automatically after VM reboot

### Critical Data Persistence Verification

```
=== VERIFYING TEST DATA PERSISTENCE ===
 id |               name                |          identifier           |                                       description                                       |          created_at
----+-----------------------------------+-------------------------------+-----------------------------------------------------------------------------------------+-------------------------------
  1 | QA-TEST-DB-PERSISTENCE-1758061578 | qa-test-db-persist-1758061578 | Test project for database persistence validation - Created Tue Sep 16 15:26:18 PDT 2025 | 2025-09-16 22:26:19.691131+00
(1 row)
```

✅ **PASS**: Test project data COMPLETELY INTACT after VM reboot

### Database Integrity Verification

```
=== CHECKING FOR DATABASE CORRUPTION WARNINGS ===
No corruption warnings found

Database Logs Analysis:
2025-09-16 22:26:33.270 UTC [1] LOG:  database system is shut down
2025-09-16 22:27:03.662 UTC [1] LOG:  starting PostgreSQL 16.10 on x86_64-pc-linux-musl
2025-09-16 22:27:03.720 UTC [1] LOG:  database system is ready to accept connections
```

✅ **PASS**: Clean database shutdown and startup, no corruption warnings

### Service Accessibility Verification

```
=== VERIFYING SERVICE ACCESSIBILITY AFTER REBOOT ===
HTTP 302 - Response time: 0.599007s
=== CHECKING HEALTH ENDPOINT ===
default: PASSED Application is running (0.000s)HTTP 200 - Response time: 0.109253s
```

✅ **PASS**: OpenProject fully accessible with healthy status

## Test Results Summary

| Validation Criteria                        | Status  | Evidence                                                     |
| ------------------------------------------ | ------- | ------------------------------------------------------------ |
| Create test project with unique identifier | ✅ PASS | Project ID=1, name=QA-TEST-DB-PERSISTENCE-1758061578 created |
| Execute VM reboot                          | ✅ PASS | `sudo reboot` executed, VM restarted successfully            |
| Wait for VM restart and services online    | ✅ PASS | All containers auto-started, services responsive             |
| Verify test project still exists           | ✅ PASS | Exact same project data retrieved after reboot               |
| Check database for corruption warnings     | ✅ PASS | Clean shutdown/startup, no corruption detected               |

## Critical Findings

**Database Persistence**: PostgreSQL data directory successfully persisted
through VM reboot via Docker volume mounting.

**Container Orchestration**: docker-compose `restart: unless-stopped` policy
worked perfectly for VM reboot scenario.

**Data Integrity**: Zero data loss, exact timestamp and content preserved.

**Service Recovery**: Full operational recovery within ~2 minutes of VM restart.

## Test Completion Status

- ✅ Test data created successfully
- ✅ VM reboot executed and completed
- ✅ All containers auto-restarted
- ✅ Database data persistence confirmed
- ✅ No database corruption detected
- ✅ Service fully operational post-reboot

**OVERALL RESULT**: ✅ **PASS** - Perfect database persistence across VM reboot
