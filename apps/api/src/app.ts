// Express application entry point.
// Phase 0: scaffolding only — health/ready wired per docs/api/openapi.yaml.
// Controllers/routes/services/repositories are filled in starting Phase 1.

import express, { type Request, type Response } from "express";

export function createApp() {
  const app = express();
  app.use(express.json());

  // GET /health — "is the process alive?" — no dependency checks (architecture.md §32).
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // GET /ready — "can we serve requests?" — checks Postgres/Redis/Qdrant, NOT Gemini
  // (a Gemini outage should degrade gracefully, not mark the whole API unhealthy).
  // TODO(Phase 1): wire real dependency pings once packages/database and packages/queue exist.
  app.get("/ready", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ready" });
  });

  // TODO(Phase 4+): mount /api/v1/auth, /api/v1/contracts, /api/v1/conversations
  // per docs/api/openapi.yaml, each as thin controller → service → repository.

  return app;
}
