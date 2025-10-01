# ERPNext Data Migration Strategy

**Status:** Not Started **Phase:** 1.5 **Agent:** Internal Team **Date
Created:** 2025-10-01 **Related Linear:** 10N-232

## Purpose

Outline the approach for moving FLRTS data into ERPNext when we decide to
perform an MVP or production migration.

## Prerequisites

- [ ] Schema mapping document completed
- [ ] Test ERPNext environment with realistic sample data
- [ ] Agreement on cutover/rollback plan

## Template

### Migration Approach

- Big bang vs incremental
- Rationale for chosen method
- Impact on downtime and user experience

### Entity Migration Order

1. Sites / Locations
2. Contractors / Vendors
3. Personnel / Technicians
4. Work Orders and related child tables
5. Attachments or auxiliary data (if any)

### Validation Requirements

- Pre/post record counts
- Spot-check queries
- Business rule verification

### Rollback Procedures

- Snapshot/backup strategy
- Steps to restore original system
- Communication plan

### Testing Strategy

- Dry-run environments
- Automated checks or scripts
- Sign-off checklist

## Notes

This document is exploratory until MVP adoption is confirmed; capture lessons
from trial migrations and update before any production attempt.
