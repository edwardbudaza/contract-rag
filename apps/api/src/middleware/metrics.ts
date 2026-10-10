// Records every request's outcome into the shared Prometheus registry
// (packages/observability/src/metrics). GET /metrics (apps/api/src/app.ts) exposes the
// result for a scraper to pull — this middleware is the only thing that writes to it.

import type { NextFunction, Request, Response } from "express";
import { metrics } from "@contract-rag/observability";

const EXCLUDED_PATHS = new Set(["/health", "/metrics"]);

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (EXCLUDED_PATHS.has(req.path)) return next();

    const endTimer = metrics.httpRequestDurationSeconds.startTimer();

    res.on("finish", () => {
      // req.route is only set once Express has matched a route, which for a 404 never
      // happens — falling back to req.path there is a conscious trade-off: it means an
      // attacker probing random paths creates one label series per path they try. Phase 4+,
      // once real routes exist, mounted routes report their pattern (e.g. "/contracts/:id"),
      // not the raw path, keeping cardinality bounded the way Prometheus expects.
      const route = req.route?.path ?? req.path;
      const labels = { method: req.method, route, status_code: String(res.statusCode) };

      metrics.httpRequestsTotal.inc(labels);
      endTimer(labels);
    });

    next();
  };
}
