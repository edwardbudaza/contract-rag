// Express application entry point.
// Phase 0 added the bare health/ready endpoints. Phase 1 wires the production foundation
// around them: correlation IDs, centralized error handling, and (in the next PR) a real
// Postgres readiness check — everything routes/controllers (Phase 4+) will be built on top of.

import express, { type Request, type Response } from "express";
import { requestId } from "./middleware/requestId";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.use(requestId());
  app.use(express.json());

  // GET /health — "is the process alive?" — no dependency checks (architecture.md §32).
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // GET /ready — still the Phase 0 stub for now; the next PR wires this to a real
  // Postgres ping once packages/database exists.
  app.get("/ready", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ready" });
  });

  // TODO(Phase 4+): mount /api/v1/auth, /api/v1/contracts, /api/v1/conversations
  // per docs/api/openapi.yaml, each as thin controller → service → repository, using
  // apps/api/src/middleware/validate.ts against packages/shared/src/schemas.ts.

  app.use(notFound());
  app.use(errorHandler());

  return app;
}
