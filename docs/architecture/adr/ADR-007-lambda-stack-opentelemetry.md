# ADR-007: BigSirFLRTS Lambda Stack — OpenTelemetry, Chat Completions, PC=1

Status: Proposed
Date: 2025-10-09
Owners: Planning (Augment), Action, QA
Related Issues: 10N-273 (parent), 10N-274 (infra), 10N-276 (Stage 1), 10N-277 (Stage 2), 10N-278 (pipeline), 10N-279 (tests)
Supersedes/Revises: X-Ray SDK guidance in scratch research (switching to OpenTelemetry)
Sources: docs/.scratch/10n-273/observations.md, docs/.scratch/10n-273/cross-agent-consensus-analysis.md

---

## Context
BigSirFLRTS runs a two-stage Telegram workflow on AWS Lambda via SAM:
- Stage 1 (webhook_handler): Telegram webhook → OpenAI parsing → DynamoDB write → Telegram confirmation (TTCC-critical)
- Stage 2 (approval_handler): Telegram callback → DynamoDB read → OpenAI + function calling → ERPNext API (long-running)

Constraints and targets:
- Node.js 22.x, ESM, esbuild bundling via SAM
- Ingress via Lambda Function URLs (lower latency, $0 cost)
- Sub-2s p95 for Stage 1 (with Provisioned Concurrency)
- ~$10–15/month baseline cost (PC dominates)
- OpenTelemetry for tracing (X-Ray SDK being deprecated in favor of OTel)

## Decision
We standardize the Lambda stack as follows:

1. OpenAI integration
- Use Chat Completions API with function calling (MVP). Revisit Agents SDK/AgentKit when multi-agent workflows justify added complexity.

1. Memory/Timeout baseline
- Stage 1: 1024MB / 10s (Provisioned Concurrency = 1)
- Stage 2: 1024MB / 90s (on-demand). Reassess to 2048MB if CPU-bound parsing requires it.

1. Observability
- Use OpenTelemetry (OTel) as the tracing standard for Lambda.
- Implementation path: ADOT (AWS Distro for OpenTelemetry) Lambda Layer for Node.js, plus minimal @opentelemetry/api spans.
- Required custom spans: openai-parse, dynamodb-write, telegram-send.
- Sampling: parentbased_always_on (default; adjust via env as needed).
- Propagation: xray (for compatibility during migration).

1. State and consistency
- DynamoDB table with TTL (non-real-time) + application-level expiry validation in Stage 2.
- Stage 2 uses ConsistentRead: true to avoid read-after-write anomalies.

1. Security
- Validate Telegram secret header (X-Telegram-Bot-Api-Secret-Token) at ingress; 403 on mismatch.
- Use IAM least-privilege per function; store secrets in AWS Secrets Manager.

1. Testing
- Vitest for ESM; coverage target ≥ 80% for Stage 1 unit tests.

## Rationale
- Chat Completions is Lambda-proven, avoids current ESM/bundling friction with Agents SDK, and is feature-equivalent for MVP via function calling.
- PC=1 eliminates cold starts for Stage 1, meeting TTCC targets within modest budget.
- OTel is the long-term AWS direction; adopting it now avoids rework and keeps vendor SDKs out of app code.
- DynamoDB TTL is non-real-time; enforcing expiry in Stage 2 ensures correctness. ConsistentRead protects immediate read-after-write.

## Consequences
- Remove aws-xray-sdk-core usage; do not author X-Ray SDK subsegments in code.
- Add ADOT layer and OTel env to SAM; add minimal @opentelemetry/api usage for custom spans.
- Stage 2 must check TTL at read time and enable ConsistentRead.
- Keep Agents SDK out of scope for MVP.

## SAM Template Snippets

OpenTelemetry (ADOT) Layer + env for WebhookHandler (Stage 1):

```yaml
Parameters:
  ADOTLayerArn:
    Type: String
    Description: "ARN for ADOT (Node.js) Lambda layer"

Resources:
  WebhookHandlerFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs22.x
      MemorySize: 1024
      Timeout: 10
      AutoPublishAlias: live
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 1
      FunctionUrlConfig:
        AuthType: NONE
      Layers:
        - !Ref ADOTLayerArn
      Environment:
        Variables:
          AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
          OTEL_SERVICE_NAME: telegram-webhook-handler
          OTEL_RESOURCE_ATTRIBUTES: !Sub "service.namespace=BigSirFLRTS,deployment.environment=${Environment}"
          OTEL_TRACES_SAMPLER: parentbased_always_on
          OTEL_PROPAGATORS: xray
```

DynamoDB + TTL (reminder):

```yaml
Resources:
  TelegramConfirmationsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      TimeToLiveSpecification:
        Enabled: true
        AttributeName: ttl
```

## Handler Spans (ESM)

```js
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('telegram-webhook');

export async function handler(event) {
  return await tracer.startActiveSpan('openai-parse', async (span) => {
    try {
      // OpenAI call here
      span.end();
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: 2, message: 'error' });
      span.end();
      throw err;
    }
  });
}
```

## Acceptance Updates (Stage 1)
- Uses OpenTelemetry (no aws-xray-sdk-core).
- Emits spans: openai-parse, dynamodb-write, telegram-send.
- Unit tests assert span creation (mock tracer) and no vendor SDK calls.

## Migration/Compatibility
- Propagation set to xray to remain compatible with AWS backends during transition.
- If/when exporting outside AWS, adjust propagators accordingly and add OTEL exporter config.

## Open Questions / Follow-ups
- Region-specific ADOT layer ARNs: add parameter default for our region in template.yaml.
- Stage 2 memory tuning: revisit 2048MB after first p95s collected.
- Future: Consider Agents SDK or AgentKit for multi-agent workflows post-MVP.

## Decision Log
- 2025-10-09: Chosen OpenTelemetry (ADOT) over X-Ray SDK; Chat Completions over Agents SDK; PC=1 for Stage 1; DynamoDB TTL + app-level expiry; ConsistentRead in Stage 2.

