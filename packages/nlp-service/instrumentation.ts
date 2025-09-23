/*instrumentation.ts*/
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const apiKey = process.env.OTEL_API_KEY || '';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    // Default: http://localhost:4318/v1/traces
    url: `${endpoint}/v1/traces`,
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      // Default: http://localhost:4318/v1/metrics
      url: `${endpoint}/v1/metrics`,
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  sdk.start();
} catch (err) {
  // Do not crash app/tests on telemetry startup failures
  // eslint-disable-next-line no-console
  console.warn('OpenTelemetry SDK failed to start:', (err as Error)?.message);
}
