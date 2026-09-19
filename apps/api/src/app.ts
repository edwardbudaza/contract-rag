// Express application entry point.
// Phase 0 added the bare health/ready endpoints. Phase 1 wires the production foundation
// around them: correlation IDs, centralized error handling, and a real Postgres readiness
// check — everything routes/controllers (Phase 4+) will be built on top of.

import express, { type Request, type Response } from "express";
import { requestId } from "./middleware/requestId";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { ping as pingDatabase } from "@contract-rag/database";

export function createApp() {
  const app = express();
  app.use(requestId());
  app.use(express.json());

  // GET /health — "is the process alive?" — no dependency checks (architecture.md §32).
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // GET /ready — "can we serve requests?" — checks Postgres now that packages/database
  // exists; Redis/Valkey and Qdrant checks are added in Phase 3/8 once those clients exist.
  // Gemini is deliberately excluded — a Gemini outage should degrade, not mark the API down.
  app.get("/ready", async (_req: Request, res: Response) => {
    const databaseOk = await pingDatabase();
    if (!databaseOk) {
      return res.status(503).json({ status: "not-ready", database: "unreachable" });
    }
    res.status(200).json({ status: "ready", database: "ok" });
  });

  // TODO(Phase 4+): mount /api/v1/auth, /api/v1/contracts, /api/v1/conversations
  // per docs/api/openapi.yaml, each as thin controller → service → repository, using
  // apps/api/src/middleware/validate.ts against packages/shared/src/schemas.ts.

  app.use(notFound());
  app.use(errorHandler());

  return app;
}
