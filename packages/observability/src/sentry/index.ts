// Sentry error/performance tracking, per docs/architecture/architecture.md §16 and ADR-005.
// Optional in local development (no SENTRY_DSN configured — init() becomes a no-op) so
// nobody needs a real Sentry account to run the app locally.

import * as Sentry from "@sentry/node";
import { config } from "@contract-rag/config";

const SENSITIVE_KEYS = ["password", "token", "authorization", "cookie", "apikey", "secret"];

// Strips everything but lowercase letters/digits before comparing, so "apiKey", "api_key",
// and "API-KEY" are all recognized as the same sensitive field — matching on raw
// case-sensitive substrings (the first version of this function did) silently misses any
// key that doesn't happen to share the exact casing/punctuation of the pattern list.
function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Recursively strips sensitive keys from any object Sentry is about to send — the same
// never-log list as packages/observability/src/logger (error-model.md §4), applied here
// too because Sentry events are a distinct pipe out of the process, not covered by Pino's
// redaction. Depth-limited defensively; error contexts are never deeply nested in practice.
function scrub(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.some((k) => normalize(key).includes(k))
      ? "[REDACTED]"
      : scrub(val, depth + 1);
  }
  return result;
}

export function initSentry(serviceName: string): void {
  if (!config.SENTRY_DSN) return; // no-op locally unless explicitly configured

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: config.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      return scrub(event) as Sentry.ErrorEvent;
    },
  });

  Sentry.setTag("service", serviceName);
}

// Called from errorHandler.ts for 5xx-class errors only — see that file's comment for why
// 4xx client errors (validation, not-found, etc.) are deliberately never reported here.
export function captureException(
  err: unknown,
  context: { requestId?: string; route?: string },
): void {
  if (!config.SENTRY_DSN) return;
  Sentry.captureException(err, {
    tags: { requestId: context.requestId, route: context.route },
  });
}

export { scrub as _scrubForTesting };
