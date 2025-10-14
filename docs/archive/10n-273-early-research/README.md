# Archived Early Research for 10N-273

This folder preserves early research artifacts that include guidance now superseded by the finalized Lambda Stack decisions.

Authoritative references
- ADR-007: docs/architecture/adr/ADR-007-lambda-stack-opentelemetry.md
- SSOT: docs/.scratch/10n-273/lambda-stack-final-synthesis.md

What changed
- Observability standard is OpenTelemetry (ADOT), not aws-xray-sdk-core
- MVP uses Chat Completions + function calling (not Agents SDK)
- Baseline sizing: Stage 1 1024MB/10s (PC=1), Stage 2 1024MB/90s

Superseded items to consult cautiously
- docs/.scratch/10n-273/observations.md — contains X-Ray SDK examples (marked with banner)
- docs/.scratch/10n-273/cross-agent-consensus-analysis.md — contains a draft child issue advocating X-Ray subsegments (lines 81–89) (marked with banner)

Note: We kept the original scratch files in-place with a [SUPERSEDED NOTICE] banner to avoid breaking links in discussions and commits. Always prefer ADR-007 and the SSOT for implementation details.

