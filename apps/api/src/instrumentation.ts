// Bootstrap side effects that MUST happen before any other module in this process is
// loaded. This file exists ONLY to be required first — see packages/observability/src/
// tracing/index.ts for exactly why OpenTelemetry auto-instrumentation requires this.
//
// Deliberately has no other exports and does nothing except start tracing and Sentry —
// keeping it this narrow is what makes "just require it first" a safe, simple rule instead
// of something you have to reason about every time this file changes.

import { tracing, sentry } from "@contract-rag/observability";

tracing.startTracing("contract-rag-api");
sentry.initSentry("contract-rag-api");
