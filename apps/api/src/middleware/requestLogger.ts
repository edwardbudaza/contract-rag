// Logs `request.received` and `request.completed` for every request, per
// docs/architecture/architecture.md §12's event-naming convention. Every log line carries
// `requestId` (from apps/api/src/middleware/requestId.ts, which must run before this) so a
// full request can be grep'd out of the logs by one ID.

import type { NextFunction, Request, Response } from "express";
import type { Logger } from "@contract-rag/observability";

// Endpoints hit by health-check pollers and metrics scrapers, not real traffic — logging
// every one of these would drown out everything that actually matters. Same exclusion list
// as tracing/index.ts's span filter, for the same reason.
const EXCLUDED_PATHS = new Set(["/health", "/metrics"]);

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (EXCLUDED_PATHS.has(req.path)) return next();

    const log = logger.child({ requestId: req.requestId });
    const startedAt = process.hrtime.bigint();

    log.info({ event: "request.received", method: req.method, path: req.path });

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      log.info({
        event: "request.completed",
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
}
