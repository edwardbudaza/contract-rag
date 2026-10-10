// OpenTelemetry foundation, per docs/architecture/architecture.md §14 and ADR-005.
//
// CRITICAL ORDERING REQUIREMENT: startTracing() must run and complete BEFORE any
// instrumented module (express, pg, http) is `require`d anywhere in the process — auto-
// instrumentation works by monkey-patching those modules' exports at require-time, so if
// express is already loaded when this runs, its patches never take effect and you silently
// get zero HTTP spans. This is why it lives in its own apps/api/src/instrumentation.ts,
// required as literally the first line of apps/api/src/index.ts, before even `./app` is
// required. Getting this wrong doesn't error — it just quietly produces no traces, which is
// a much worse failure mode to debug than a crash.

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { config } from "@contract-rag/config";

let sdk: NodeSDK | undefined;

export function startTracing(serviceName: string): void {
  const traceExporter = config.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({ url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` })
    : new ConsoleSpanExporter(); // local dev fallback — see docs/operations/configuration.md

  sdk = new NodeSDK({
    serviceName,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Health checks and the metrics scrape endpoint would otherwise generate a span on
        // every single request — pure noise for a system with real traffic.
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) =>
            req.url === "/health" || req.url === "/metrics",
        },
      }),
    ],
  });

  sdk.start();
}

// Called from each app's SIGTERM handler — flushes any buffered spans before the process
// actually exits, so a graceful shutdown doesn't silently drop the last few traces.
export async function shutdownTracing(): Promise<void> {
  await sdk?.shutdown();
}
