// Structured logging, per docs/architecture/architecture.md §11 and ADR-005. One factory,
// called once per process (apps/api and apps/worker each call it with their own service name)
// — everything downstream gets a `logger.child({...})` from that one instance rather than
// constructing its own, so every log line shares the same redaction rules and base fields.

import pino from "pino";
import { config } from "@contract-rag/config";

// Enforces error-model.md §4's "never log" list at the logging layer itself, not just by
// convention. Pino redacts these paths from ANY object logged under these keys, wherever they
// appear in the log call's argument — this is defense in depth, not a replacement for callers
// still being careful about what they pass to `logger.info(...)`.
const REDACT_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "authorization",
  "*.authorization",
  "req.headers.authorization",
  "req.headers.cookie",
  "apiKey",
  "*.apiKey",
  "secret",
  "*.secret",
];

export function createLogger(serviceName: string, destination?: NodeJS.WritableStream) {
  const options: pino.LoggerOptions = {
    level: config.NODE_ENV === "production" ? "info" : "debug",
    base: { service: serviceName },
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    // Pretty-print in development only — production wants raw JSON for log aggregators.
    // (Never combined with an explicit `destination` below — pino rejects that combination,
    // and the only caller that passes one is the test suite, which never runs with
    // NODE_ENV=development.)
    transport:
      config.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
        : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // The `destination` parameter exists ONLY so tests/unit/observability/logger.test.ts can
  // capture output into an in-memory stream and assert on redaction, without either mocking
  // pino itself or asserting against real stdout. Production code never passes it.
  return destination ? pino(options, destination) : pino(options);
}

export type Logger = ReturnType<typeof createLogger>;
