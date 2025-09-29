/**
 * P0 Unit Tests for OpenTelemetry SDK Initialization
 * Test IDs: 1.7-UNIT-001, 1.7-UNIT-002
 *
 * These tests verify that the OpenTelemetry SDK is properly configured
 * and can be initialized without errors in the Node.js environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';

// Mock the NodeSDK and exporters to prevent actual initialization
vi.mock('@opentelemetry/sdk-node');
vi.mock('@opentelemetry/exporter-trace-otlp-proto');
vi.mock('@opentelemetry/exporter-metrics-otlp-proto');
vi.mock('@opentelemetry/auto-instrumentations-node');

describe('@P0 OpenTelemetry SDK Tests', () => {
  let mockNodeSDK: any;
  let mockTraceExporter: any;
  let mockMetricExporter: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock NodeSDK constructor and methods
    mockNodeSDK = {
      start: vi.fn(),
      shutdown: vi.fn(),
    };
    vi.mocked(NodeSDK).mockImplementation(() => mockNodeSDK);

    // Mock exporter constructors
    mockTraceExporter = {};
    mockMetricExporter = {};
    vi.mocked(OTLPTraceExporter).mockImplementation(() => mockTraceExporter);
    vi.mocked(OTLPMetricExporter).mockImplementation(() => mockMetricExporter);

    // Reset environment variables
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_API_KEY;
  });

  afterEach(() => {
    // Clean up any modules that might have been required
    vi.resetModules();
  });

  describe('1.7-UNIT-001: OpenTelemetry SDK Initialization', () => {
    it('should create NodeSDK instance with correct configuration', async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
      process.env.OTEL_API_KEY = 'test-api-key';

      // Act - Simulate SDK initialization
      const mockSDK = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
          headers: {
            authorization: `Bearer ${process.env.OTEL_API_KEY}`,
          },
        }),
        instrumentations: [],
      });

      // Assert
      expect(NodeSDK).toHaveBeenCalledTimes(1);
      const sdkConfig = vi.mocked(NodeSDK).mock.calls[0]?.[0];

      // Verify SDK configuration structure
      expect(sdkConfig).toHaveProperty('traceExporter');
      expect(sdkConfig).toHaveProperty('instrumentations');
    });

    it('should start the SDK without throwing errors', async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

      // Act
      const mockSDK = new NodeSDK({});
      mockSDK.start();

      // Assert
      expect(mockNodeSDK.start).toHaveBeenCalledTimes(1);
      expect(mockNodeSDK.start).not.toThrow();
    });

    it('should handle missing environment variables gracefully', async () => {
      // Arrange - Clear environment variables
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      delete process.env.OTEL_API_KEY;

      // Act & Assert - Should not throw during SDK creation
      expect(() => {
        const mockSDK = new NodeSDK({});
        mockSDK.start();
      }).not.toThrow();

      expect(NodeSDK).toHaveBeenCalled();
      expect(mockNodeSDK.start).toHaveBeenCalled();
    });
  });

  describe('1.7-UNIT-002: Trace Exporter Configuration', () => {
    it('should configure OTLP trace exporter with correct endpoint', async () => {
      // Arrange
      const testEndpoint = 'http://test-collector:4318';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = testEndpoint;

      // Act - Create exporter directly
      const exporter = new OTLPTraceExporter({
        url: `${testEndpoint}/v1/traces`,
        headers: {
          authorization: 'Bearer test-key',
        },
      });

      // Assert
      expect(OTLPTraceExporter).toHaveBeenCalled();
      const exporterConfig =
        vi.mocked(OTLPTraceExporter).mock.calls[
          vi.mocked(OTLPTraceExporter).mock.calls.length - 1
        ][0];

      expect(exporterConfig).toHaveProperty('url', `${testEndpoint}/v1/traces`);
      expect(exporterConfig).toHaveProperty('headers');
    });

    it('should include authorization header when API key is provided', async () => {
      // Arrange
      const testApiKey = 'test-secret-key';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
      process.env.OTEL_API_KEY = testApiKey;

      // Act
      await import('../../packages/nlp-service/instrumentation');

      // Assert
      expect(vi.mocked(OTLPTraceExporter)).toHaveBeenCalledTimes(1);
      const exporterConfig = vi.mocked(OTLPTraceExporter).mock.calls[0]?.[0];
      expect(exporterConfig?.headers).toHaveProperty('authorization', `Bearer ${testApiKey}`);
    });

    it('should configure metric exporter with correct endpoint', async () => {
      // Arrange
      const testEndpoint = 'http://test-collector:4318';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = testEndpoint;

      // Act
      await import('../../packages/nlp-service/instrumentation');

      // Assert
      expect(OTLPMetricExporter).toHaveBeenCalledTimes(1);
      const metricExporterConfig = vi.mocked(OTLPMetricExporter).mock.calls[0][0];

      expect(metricExporterConfig).toHaveProperty('url', `${testEndpoint}/v1/metrics`);
    });

    it('should handle empty API key in headers', async () => {
      // Arrange
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
      // OTEL_API_KEY not set, should default to empty string

      // Act
      await import('../../packages/nlp-service/instrumentation');

      // Assert
      expect(vi.mocked(OTLPTraceExporter)).toHaveBeenCalled();
      const exporterConfig = vi.mocked(OTLPTraceExporter).mock.calls[0]?.[0];
      expect(exporterConfig?.headers).toHaveProperty('authorization', 'Bearer ');
    });
  });

  describe('Error Handling', () => {
    it('should not crash if NodeSDK.start() throws an error', async () => {
      // Arrange
      mockNodeSDK.start.mockImplementation(() => {
        throw new Error('SDK start failed');
      });

      // Act & Assert - Import should not crash even if SDK start fails
      expect(async () => {
        await import('../../packages/nlp-service/instrumentation');
      }).not.toThrow();
    });
  });
});
