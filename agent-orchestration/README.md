# Agent Orchestration for BigSirFLRTS

This guide documents the multi-agent workflow used on BigSirFLRTS and provides
copyable templates to accelerate coordination. It complements the Linear master
dashboard 10N-275 and the Planning Agent spec.

## Overview

The project uses a small set of specialized agents to move work quickly while
keeping humans in the loop:

- Planning Agent: Orchestrates the work, maintains 10N-275, drafts prompts,
  verifies against standards.
- Action Agent: Implements code/config, writes tests, and performs safe
  verification runs.
- QA Agent: Validates deliverables against acceptance criteria and standards.
- Research Agent: Gathers references, specs, and comparative analyses.
- Browser Agent: Performs web verification or collects external documentation.
- Tracking Agent: Observability, alarms, telemetry, and metrics.

Why: Repeatable coordination, clear handoffs, and higher quality with less
rework.

## Agent Roles (Responsibilities)

- Planning: Plan, prioritize, draft prompts (Goal/Do/Acceptance), maintain
  dashboard, verify work and standards, manage handoffs.
- Action: Implement code, write/maintain tests, run safe verification
  (builds/linters/tests), prepare docs; ask before installs/deployments.
- QA: Validate deliverables, acceptance criteria, test coverage, standards
  conformance; file follow-ups.
- Research: Compile authoritative sources, specs, comparisons; produce scratch
  notes with citations.
- Browser: Fetch authoritative documents/web content; capture snapshots and cite
  sources.
- Tracking: Implement telemetry/alerts, SLOs, dashboards, and incident
  guardrails.

## Master Dashboard (Linear 10N-275)

- 10N-275 is the coordination hub. One work block per parent Linear issue; jobs
  map to child issues.
- Only the next job (“marquee”) shows a full prompt; the rest are an ordered
  queue.
- Dependency gating rule and Max 5 active work blocks apply (see 10N-275).

## Work Block Structure

Parent issue → Work block. Child issues → Jobs.

- Fields: Status, Last Updated, Summary, Next Job (marquee) Prompt, Jobs
  checklist, Blocker.
- Copyable template lives in 10N-275. A YAML version is in
  templates/work-block-template.yml.

## Handoff Protocol

- Use addressing from docs/prompts/reference_docs/agent-addressing.md
  - Example: `planning -> action | issue 10N-273: Install AWS tooling`
- Maintain issue-level Handoff Logs in Linear comments for every handoff.
- Use `---` to separate responses when multiple agents are involved.

## Session Start Checklist (Planning Agent)

- Read 10N-275 to restore state
- Review children of the active parent issue
- Select next actionable child; note dependencies/blockers
- Update the work block (marquee + jobs)

Recent updates (2025-10-09): Minimal system prompt, parameter defaults, session
start checklist, and handoff log template were added to
docs/prompts/planning-agent.md.

## Prompt Engineering

Prompts have three sections:

- Goal: The single objective
- Do: The concrete steps
- Acceptance: Observable outcomes

Recurring lessons to embed by default:

- External API validation (curl/spec, example envelopes, explicit auth header
  format)
- DocType selection process for ERPNext
- Retry + error handling (ECONNREFUSED/ETIMEDOUT/ECONNRESET/ENOTFOUND/HTTP 5xx,
  timeouts, config delay/attempts, no 4xx retries)
- Secret masking & logging (2-char reveal policy; \*\*\* fallback; NODE_ENV
  guards)
- Prototype promotion gate (tsc --noEmit, mock checks, TODO cleanup, env var
  docs, linter, function-level docs)
- Risk register + follow-up tickets
- Discovery artifacts (docs/.scratch/<issue>/observations.md)
- Frappe Cloud bench guardrails (no config-changing bench commands; record
  migrations)

## Linear MCP Integration

- Use Linear MCP tools to update issue descriptions (source of truth) and
  comments (handoffs/decisions).
- Typical tools: get_issue, update_issue, create_comment, list_issues.
- Keep prompts and checklists in descriptions; keep narratives in comments.

## Scratch Artifacts

- Location: docs/.scratch/<issue>/
- Contents: observations.md, prototypes, temporary notes, research extracts
- Archive when learned → docs/.scratch/.archive/

## Five-Phase Loop

Research → Prototype → Validate → Implement → Archive.

- Require scratch artifacts for phases 1–3 before promoting to production code.

## Templates

See agent-orchestration/templates/ for:

- Agent definitions for planning, action, QA, research, browser, tracking
- YAML work block template (work-block-template.yml)
- YAML handoff log template (handoff-log-template.yml)

## Quick Wins for Human-in-the-Loop Coordination

- Standardize session names: `planning-YYYY-MM-DD-session-N`
- Generate handoff logs automatically (script template) and paste to Linear
  comments
- Dashboard snapshot/diff tools to show changes in 10N-275 between sessions
- Enforce multi-agent response separators: `---`
- Pre-flight: confirm parent issue, backlog, and dependencies; refresh 10N-275
- Post-session: archive scratch artifacts, update 10N-275, record lessons
  learned
- Create a short `Agent Session Summary` template for comments (see
  handoff-log-template.yml)
- Use labels/colors per work block; optionally route chatter to per-block
  Slack/Discord threads
- Add CLI helpers for “promote marquee” and “append new job” to 10N-275
- Keep secrets out of repo; use ~/.codex/.env; verify with
  `grep "LINEAR_API_KEY" ~/.codex/.env`
