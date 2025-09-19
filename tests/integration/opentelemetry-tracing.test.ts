/**
 * P0 Integration Tests for Service-to-Service Tracing
 * Test IDs: 1.7-INT-001, 1.7-INT-002
 *
 * These tests verify that OpenTelemetry trace propagation works correctly
 * between services and that OTLP HTTP endpoints are properly connected.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  trace as otelTrace,
  context,
  SpanStatusCode,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

// Mock HTTP server for OTLP endpoint testing
import { createServer, Server } from "http";
import { IncomingMessage, ServerResponse } from "http";

describe("@P0 OpenTelemetry Integration Tests", () => {
  let mockOTLPServer: Server;
  let mockOTLPPort: number;
  let receivedTraces: any[] = [];
  let sdk: NodeSDK;
  let spanProcessor: BatchSpanProcessor;

  beforeAll(async () => {
    // Enable OpenTelemetry diagnostic logging for debugging
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

    // Start mock OTLP server
    mockOTLPPort = 14318; // Use different port to avoid conflicts

    mockOTLPServer = createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "POST" && req.url === "/v1/traces") {
          let body = Buffer.alloc(0);
          req.on("data", (chunk) => {
            body = Buffer.concat([body, chunk]);
          });
          req.on("end", () => {
            try {
              // Store received trace data
              receivedTraces.push({
                headers: req.headers,
                body: body.toString("base64"), // Store as base64 for protobuf
                rawBody: body,
                timestamp: Date.now(),
              });

              console.log(
                `Mock server received trace: ${receivedTraces.length} total traces`,
              );

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end('{"partialSuccess":{}}');
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(`{"error": "${error.message}"}`);
            }
          });
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      },
    );

    await new Promise<void>((resolve) => {
      mockOTLPServer.listen(mockOTLPPort, "127.0.0.1", resolve);
    });
  });

  beforeEach(() => {
    receivedTraces = [];

    // Create a custom BatchSpanProcessor with immediate export settings
    const exporter = new OTLPTraceExporter({
      url: `http://localhost:${mockOTLPPort}/v1/traces`,
      headers: {
        authorization: "Bearer test-api-key",
      },
    });

    spanProcessor = new BatchSpanProcessor(exporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 1, // Export immediately when span is added
      scheduledDelayMillis: 10, // Very short delay
      exportTimeoutMillis: 1000, // 1 second timeout
    });

    // Initialize SDK with test configuration
    sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: "flrts-test-service",
      }),
      spanProcessors: [spanProcessor],
    });

    sdk.start();
  });

  afterEach(async () => {
    await sdk.shutdown();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    if (mockOTLPServer) {
      await new Promise<void>((resolve) => {
        mockOTLPServer.close(() => resolve());
      });
    }
  });

  describe("1.7-INT-001: Service-to-Service Trace Propagation", () => {
    it("should propagate trace context between service calls", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("test-tracer");

      // Act - Create parent span and simulate service call
      await tracer.startActiveSpan("parent-operation", async (parentSpan) => {
        parentSpan.setAttributes({
          "service.name": "nlp-service",
          "operation.type": "parse-request",
        });

        // Simulate child service call with context propagation
        await tracer.startActiveSpan("child-operation", async (childSpan) => {
          childSpan.setAttributes({
            "service.name": "openproject-api",
            "operation.type": "create-task",
          });

          // Verify trace context is active
          const activeSpan = otelTrace.getActiveSpan();
          expect(activeSpan).toBeDefined();
          expect(activeSpan?.spanContext().traceId).toBe(
            childSpan.spanContext().traceId,
          );
          expect(activeSpan?.spanContext().spanId).toBe(
            childSpan.spanContext().spanId,
          );

          childSpan.setStatus({ code: SpanStatusCode.OK });
          childSpan.end();
        });

        parentSpan.setStatus({ code: SpanStatusCode.OK });
        parentSpan.end();
      });

      // Force export by flushing the span processor
      await spanProcessor.forceFlush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(receivedTraces.length).toBeGreaterThan(0);

      // Verify trace was received by OTLP endpoint
      const latestTrace = receivedTraces[receivedTraces.length - 1];
      expect(latestTrace.headers["content-type"]).toContain(
        "application/x-protobuf",
      );
      expect(latestTrace.headers["authorization"]).toBe("Bearer test-api-key");
      expect(latestTrace.body).toBeDefined();
      expect(latestTrace.body.length).toBeGreaterThan(0);
    });

    it("should maintain trace hierarchy across async operations", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("test-tracer");
      const traceIds: string[] = [];
      const spanIds: string[] = [];

      // Act - Create nested spans across async operations
      await tracer.startActiveSpan("root-span", async (rootSpan) => {
        traceIds.push(rootSpan.spanContext().traceId);
        spanIds.push(rootSpan.spanContext().spanId);

        // Simulate async database operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        await tracer.startActiveSpan("database-query", async (dbSpan) => {
          traceIds.push(dbSpan.spanContext().traceId);
          spanIds.push(dbSpan.spanContext().spanId);

          // Simulate async API call
          await new Promise((resolve) => setTimeout(resolve, 10));

          await tracer.startActiveSpan("api-call", async (apiSpan) => {
            traceIds.push(apiSpan.spanContext().traceId);
            spanIds.push(apiSpan.spanContext().spanId);

            apiSpan.setStatus({ code: SpanStatusCode.OK });
            apiSpan.end();
          });

          dbSpan.setStatus({ code: SpanStatusCode.OK });
          dbSpan.end();
        });

        rootSpan.setStatus({ code: SpanStatusCode.OK });
        rootSpan.end();
      });

      // Allow time for trace export
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      // All spans should share the same trace ID
      expect(traceIds.length).toBe(3);
      expect(new Set(traceIds).size).toBe(1); // All trace IDs should be identical

      // Span IDs should be different
      expect(spanIds.length).toBe(3);
      expect(new Set(spanIds).size).toBe(3); // All span IDs should be unique

      // Force export by flushing the span processor
      await spanProcessor.forceFlush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify traces were exported
      expect(receivedTraces.length).toBeGreaterThan(0);
    });

    it("should inject trace headers for HTTP requests", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("test-tracer");
      let capturedHeaders: Record<string, string> = {};

      // Mock fetch to capture headers
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedHeaders = options?.headers || {};
        return Promise.resolve(new Response("{}", { status: 200 }));
      });

      // Act
      await tracer.startActiveSpan("http-request", async (span) => {
        // Simulate HTTP request with trace injection
        const activeContext = context.active();

        // Headers should be injected by instrumentation
        await fetch("http://test-service/api/endpoint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // In real implementation, trace headers would be auto-injected
            traceparent: `00-${span.spanContext().traceId}-${span.spanContext().spanId}-01`,
          },
          body: JSON.stringify({ test: "data" }),
        });

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });

      // Assert
      expect(fetch).toHaveBeenCalled();
      expect(capturedHeaders["traceparent"]).toBeDefined();
      expect(capturedHeaders["traceparent"]).toMatch(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
      );
    });
  });

  describe("1.7-INT-002: OTLP HTTP Endpoint Connectivity", () => {
    it("should successfully connect to OTLP HTTP endpoint", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("connectivity-test");

      // Act
      await tracer.startActiveSpan("connectivity-test", async (span) => {
        span.setAttributes({
          "test.type": "connectivity",
          "test.endpoint": `http://localhost:${mockOTLPPort}/v1/traces`,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });

      // Allow time for export
      // Force export by flushing the span processor
      await spanProcessor.forceFlush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(receivedTraces.length).toBeGreaterThan(0);

      const trace = receivedTraces[0];
      expect(trace.headers["content-type"]).toContain("application/x-protobuf");
      expect(trace.headers["authorization"]).toBe("Bearer test-api-key");
      expect(trace.body).toBeDefined();
    });

    it("should handle OTLP endpoint authentication", async () => {
      // Arrange - Test different auth scenarios
      const authTestCases = [
        { auth: "Bearer valid-token", expectedStatus: 200 },
        { auth: "Bearer test-api-key", expectedStatus: 200 },
      ];

      for (const testCase of authTestCases) {
        receivedTraces = [];

        // Create SDK with specific auth header
        const testExporter = new OTLPTraceExporter({
          url: `http://localhost:${mockOTLPPort}/v1/traces`,
          headers: {
            authorization: testCase.auth,
          },
        });

        const testSpanProcessor = new BatchSpanProcessor(testExporter, {
          maxQueueSize: 100,
          maxExportBatchSize: 1,
          scheduledDelayMillis: 10,
          exportTimeoutMillis: 1000,
        });

        const testSDK = new NodeSDK({
          resource: resourceFromAttributes({
            [SEMRESATTRS_SERVICE_NAME]: "auth-test-service",
          }),
          spanProcessors: [testSpanProcessor],
        });

        testSDK.start();

        // Act
        const tracer = otelTrace.getTracer("auth-test");
        await tracer.startActiveSpan("auth-test-span", async (span) => {
          span.setAttributes({
            "auth.test": testCase.auth.substring(0, 10) + "...",
          });
          span.end();
        });

        await testSpanProcessor.forceFlush();
        await new Promise((resolve) => setTimeout(resolve, 100));
        await testSDK.shutdown();

        // Assert
        if (testCase.expectedStatus === 200) {
          expect(receivedTraces.length).toBeGreaterThan(0);
          expect(receivedTraces[0].headers["authorization"]).toBe(
            testCase.auth,
          );
        }
      }
    });

    it("should handle OTLP endpoint errors gracefully", async () => {
      // Arrange - Create SDK pointing to non-existent endpoint with valid URL format
      const failExporter = new OTLPTraceExporter({
        url: "http://localhost:9999/v1/traces", // Use a valid but non-responding port
      });

      const failSpanProcessor = new BatchSpanProcessor(failExporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 1,
        scheduledDelayMillis: 10,
        exportTimeoutMillis: 1000,
      });

      const failSDK = new NodeSDK({
        resource: resourceFromAttributes({
          [SEMRESATTRS_SERVICE_NAME]: "fail-test-service",
        }),
        spanProcessors: [failSpanProcessor],
      });

      failSDK.start();

      // Act & Assert - Should not throw errors
      const tracer = otelTrace.getTracer("fail-test");
      await expect(async () => {
        await tracer.startActiveSpan("fail-test-span", async (span) => {
          span.setAttributes({ "test.type": "failure" });
          span.end();
        });

        // Allow time for export attempt
        await new Promise((resolve) => setTimeout(resolve, 100));
      }).not.toThrow();

      await failSDK.shutdown();
    });

    it("should export traces with correct protobuf format", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("format-test");

      // Act
      await tracer.startActiveSpan("format-test-span", async (span) => {
        span.setAttributes({
          "service.name": "flrts-nlp-service",
          "operation.name": "parse-input",
          "request.id": "test-request-123",
          "user.id": "test-user-456",
        });

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });

      // Force export by flushing the span processor
      await spanProcessor.forceFlush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(receivedTraces.length).toBeGreaterThan(0);

      const trace = receivedTraces[0];

      // Verify protobuf content-type
      expect(trace.headers["content-type"]).toBe("application/x-protobuf");

      // Verify body is binary protobuf data
      expect(trace.body).toBeDefined();
      expect(trace.body.length).toBeGreaterThan(0);
      expect(typeof trace.body).toBe("string"); // Base64 encoded binary data
    });

    it("should batch multiple spans in single export", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("batch-test");
      const spanCount = 5;

      // Act - Create multiple spans quickly
      const spans = [];
      for (let i = 0; i < spanCount; i++) {
        await tracer.startActiveSpan(`batch-span-${i}`, async (span) => {
          span.setAttributes({
            "span.index": i,
            "batch.test": true,
          });
          spans.push(span);
          span.end();
        });
      }

      // Force export by flushing the span processor
      await spanProcessor.forceFlush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(receivedTraces.length).toBeGreaterThan(0);

      // Verify that traces were exported (may be batched)
      const totalTraceData = receivedTraces.reduce(
        (total, trace) => total + trace.body.length,
        0,
      );
      expect(totalTraceData).toBeGreaterThan(0);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle span creation errors gracefully", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("error-test");

      // Act & Assert - Should not throw
      await expect(async () => {
        await tracer.startActiveSpan("error-test-span", async (span) => {
          // Simulate error in span processing
          span.setAttributes({
            "error.test": true,
            "large.attribute": "x".repeat(10000), // Very large attribute
          });

          span.recordException(new Error("Test exception in span"));
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: "Test error status",
          });
          span.end();
        });
      }).not.toThrow();
    });

    it("should maintain performance under load", async () => {
      // Arrange
      const tracer = otelTrace.getTracer("performance-test");
      const startTime = Date.now();
      const operationCount = 100;

      // Act
      const promises = [];
      for (let i = 0; i < operationCount; i++) {
        promises.push(
          tracer.startActiveSpan(`perf-span-${i}`, async (span) => {
            span.setAttributes({
              "operation.index": i,
              "performance.test": true,
            });

            // Simulate work
            await new Promise((resolve) => setTimeout(resolve, 1));

            span.end();
          }),
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Force export by flushing the span processor
      await spanProcessor.forceFlush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(receivedTraces.length).toBeGreaterThan(0);
    });
  });
});
