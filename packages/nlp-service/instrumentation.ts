/*instrumentation.ts*/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    // Default: http://localhost:4318/v1/traces
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + "/v1/traces",
    headers: {
      authorization: `Bearer ${process.env.OTEL_API_KEY || ""}`,
    },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      // Default: http://localhost:4318/v1/metrics
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + "/v1/metrics",
      headers: {
        authorization: `Bearer ${process.env.OTEL_API_KEY || ""}`,
      },
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
