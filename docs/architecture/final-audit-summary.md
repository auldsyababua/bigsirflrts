# FLRTS Final Audit Summary & Remediation Roadmap

Last updated: 2025-09-30
Owner: Architecture
Scope: Modules 1–7 (Infrastructure → Frontend/API)
Artifacts: see audit-results/*.json and docs/architecture/audit-log.md

## Executive Summary

- 30 issues filed across 7 modules (IDs ~ 10N-163 → 10N-192)
- Severities: Critical 1, High 3, Medium ~13, Low ~14 (approx; see Module rollups)
- Key themes: Secret & config hygiene, API-only integration, auth/RLS, timeouts/backoff/idempotency, webhook verification, CORS, rate limiting, and observability
- Architectural decision: OpenProject integration is API-only (no DB triggers)

## Findings Rollup by Module

1. Infrastructure

- CRITICAL: Hardcoded Supabase credentials (10N-163)
- HIGH: Default SECRET_KEY_BASE/Admin password (10N-164)
- MEDIUM: TELEGRAM_BOT_URL without companion service (10N-165)
- LOW: Open ports on 0.0.0.0 in dev (10N-166)

2. OpenProject Integration

- HIGH: Hardcoded project ID (10N-167)
- MEDIUM: Missing retry/backoff/idempotency (10N-168)
- MEDIUM: Env-coupled dictionary IDs (10N-169)
- LOW: Secret prefix logging (10N-170)
- ARCHITECTURAL: Enforce API-only vs DB triggers (10N-171)

3. NLP / AI Service

- HIGH: No timeout/backoff for OpenAI calls (10N-172)
- MEDIUM: No token/cost tracking (10N-173)
- MEDIUM: Reasoning stored w/o redaction policy (10N-174)
- LOW: Model selection hardcoded (10N-175)
- LOW: Supabase logging uses anon key (10N-176)

4. Telegram Bot

- MEDIUM: n8n webhook queueing w/o auth/signature (10N-177)
- LOW: No app-level rate limit on edge function (10N-178)
- LOW: PII logging w/o retention/RLS policy (10N-179)

5. n8n Workflows

- MEDIUM: No DLQ-like pattern for repeated failures (10N-181)
- LOW: Workers lack CPU/memory limits (10N-182)
- LOW: Missing workflow-level retry/backoff (10N-183)

6. Supabase Integration

- HIGH: Missing RLS on sensitive tables (10N-184)
- MEDIUM: Missing migrations for referenced tables (10N-185)
- MEDIUM: Auth site_url misconfigured (localhost) (10N-186)
- LOW: Monitoring views exposed to auth users (10N-187)

7. Frontend & API

- MEDIUM: CORS wide-open for edge/API (10N-188)
- MEDIUM: Unauth endpoints; harden /history, /parse (10N-189)
- LOW: Missing rate limiting (Express) (10N-190)
- LOW: Missing Helmet/security headers baseline (10N-191)
- LOW: Missing Helmet/security headers baseline (10N-192)

## Top Priorities (P0/P1)

P0 (address immediately)

- 10N-163: Remove hardcoded DB credentials; rotate secrets
- 10N-164: Replace default SECRET_KEY_BASE/admin password; rotate creds
- 10N-172: Add timeout/backoff/circuit breaker to OpenAI calls
- 10N-184: Implement RLS on sensitive tables; verify policy tests

P1 (next)

- 10N-167, 10N-168, 10N-169, 10N-171: OpenProject API-only hardening, config and idempotency
- 10N-177, 10N-181: Webhook HMAC + DLQ-like pattern for n8n
- 10N-188, 10N-189: CORS tightening + auth/RBAC on endpoints
- 10N-185, 10N-186: DB migrations for referenced tables; fix site_url

## Remediation Roadmap

Phase 0 (0–2 days)

- Secrets: 10N-163, 10N-164
- AI Reliability: 10N-172
- Supabase Security: 10N-184

Phase 1 (3–7 days)

- OpenProject config/idempotency: 10N-167/168/169/171
- Webhook auth + DLQ: 10N-177, 10N-181
- CORS/auth hardening: 10N-188, 10N-189
- Missing migrations + site_url: 10N-185, 10N-186

Phase 2 (1–2 weeks)

- n8n operational hardening: 10N-182, 10N-183
- API baseline security: 10N-190, 10N-191, 10N-192
- Logging/PII policy: 10N-174, 10N-179
- Misc hardening: 10N-166, 10N-170, 10N-175, 10N-176, 10N-187

## Ownership Model (Agents as "Ghost Assignees")

Because Linear has a single human user, use labels to indicate the best-suited agent. Suggested label set:

- agent-architect (Winston): architecture/infra design, security posture, RLS strategy
- agent-dev (James): code changes, SDK timeouts, idempotency, API/Express/n8n changes
- agent-analyst (Mary): data policy, redaction/retention, cost controls
- agent-cloudflare: tunnel/proxy/CDN security (if applicable)
- agent-infra-devops: platform/devops (CI/CD, secrets, tunnels, containers, infra automation)
- agent-qa: verification tasks and test coverage
- agent-cleanup: refactors, logging normalization

Proposed mapping (applied as labels):

- Module 1: 10N-163/164 → agent-infra-devops; 165/166 → agent-dev
- Module 2: 167–170 → agent-dev; 171 → agent-infra-devops
- Module 3: 172–176 → agent-dev (174 additionally agent-analyst); 177 → agent-infra-devops
- Module 4: 178–179 → agent-dev
- Module 5: 181–183 → agent-dev
- Module 6: 184/186 → agent-architect; 185/187 → agent-dev
- Module 7: 188–192 → agent-dev

Tip: Optionally add a Linear custom field “Agent” with enum values matching the above; until then, labels are sufficient for triage and filtering.

## Label Normalization

Every issue should have:

- audit (constant)
- module-1..module-7
- Severity-{Critical|High|Medium|Low|Architectural}
- agent-{architect|dev|analyst|cloudflare|qa|cleanup}

Status workflow: Backlog → Ready → In Progress → Review → Done

## Validation & Done Criteria

- All P0 issues closed with evidence (PR links, config diffs)
- Security-sensitive changes validated in CI and in staging
- RLS policies verified with policy tests and least-privilege checks
- Webhooks verified with signature tests and negative paths
- API gateway verified: CORS tightened, auth enforced, rate limiting + helmet enabled

## References

- docs/architecture/audit-log.md (living log)
- audit-results/* (module JSONs)
- .claude/commands/BMad/agents/* (agents/roles)
