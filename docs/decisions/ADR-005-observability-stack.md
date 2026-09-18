# ADR-005: Observability Stack

Status: Accepted
Date: 2026-09-18

## Context

An async, multi-hop system (API → queue → worker → Gemini/Qdrant) is hard to debug without
structured logs, distributed traces, and error tracking correlated across hops. We need to be
able to answer "what happened to contract X?" end to end.

## Decision

- **Pino** for structured JSON logs (fast, low overhead, integrates cleanly with log aggregators
  and Sentry breadcrumbs).
- **OpenTelemetry** for distributed tracing and metrics instrumentation across API and worker.
- **Sentry** for exception/error tracking and performance monitoring.
- **Correlation IDs** (`requestId` → `jobId` → `traceId`) are threaded through every log line,
  span, and Sentry event, per `docs/architecture/architecture.md` §44.

This stack must exist **before** complex AI functionality is built (Phase 2 precedes Phase 7+ in
the implementation plan) — the system should already be observable when the RAG pipeline lands.

## Consequences

- Every log line and Sentry event must be scrubbed per `docs/architecture/error-model.md` §4
  before it ships — this is a hard constraint on the Pino/Sentry integration, not an
  afterthought.
- Upfront instrumentation cost (OTel spans, Pino call sites) is paid early, in exchange for not
  debugging async failures blind later.

## Alternatives Considered

- **Winston** (logging) — rejected: slower than Pino, weaker JSON-first defaults.
- **Vendor-specific agents (e.g. Datadog APM)** — rejected: vendor lock-in versus the
  OpenTelemetry-standard approach, which keeps a backend swap possible later.

## Links

- `docs/architecture/architecture.md` §10–17, §44 (observability flow)
- `docs/architecture/error-model.md` §4 (sensitive-data rules)
