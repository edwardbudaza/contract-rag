// Assigns a correlation ID to every request. This is the `requestId` that flows into
// Problem responses (packages/shared/src/errors.ts) and, from Phase 2 onward, into every
// log line and Sentry event for that request — see docs/architecture/architecture.md §13.

import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Respect an inbound ID from a load balancer / upstream proxy if present, otherwise mint one.
    const incoming = req.header("x-request-id");
    req.requestId = incoming && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader("x-request-id", req.requestId);
    next();
  };
}
