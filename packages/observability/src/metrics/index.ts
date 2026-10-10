// Prometheus-compatible metrics, per docs/architecture/architecture.md §15. One shared
// Registry — apps/api and apps/worker each register their own metrics into it, and each
// exposes it at GET /metrics (apps/api/src/app.ts) for a Prometheus scraper to pull.

import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();

// CPU/memory/event-loop-lag/etc — the "system metrics" bullet from architecture.md §15,
// for free, from prom-client itself.
collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  // Buckets tuned for a typical API request, not an LLM call — Phase 9/10 add separate
  // RAG-specific histograms (retrieval latency, LLM latency) with much wider buckets,
  // per architecture.md §15's "RAG metrics" list. Mixing the two here would blur both.
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});
