// The single place every error in the API becomes an HTTP response. Mounted last, after
// every route and after notFound(). Express recognizes this as error-handling middleware
// specifically because it declares all four (err, req, res, next) parameters.
//
// Rules enforced here, straight from docs/architecture/error-model.md:
//   - every response body is an RFC 7807 Problem (type/title/detail/status/requestId)
//   - an AppError's `detail` is client-safe by construction (packages/shared/src/errors.ts)
//     and is passed through as-is
//   - anything that is NOT an AppError is an unexpected/programmer error: the client gets a
//     bare 500 InternalError with no `detail` at all, while the full error is logged
//     server-side (console.error for now — Phase 2 swaps this for Pino + Sentry without
//     changing this function's contract)

import type { NextFunction, Request, Response } from "express";
import { AppError, InternalError } from "@contract-rag/shared";

export function errorHandler() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const appError = err instanceof AppError ? err : null;

    if (!appError) {
      // Never let a raw error message/stack reach the client — log it server-side and
      // respond with a generic 500 instead. See error-model.md §4 sensitive-data rules.
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          event: "request.failed",
          requestId: req.requestId,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        }),
      );
    }

    const resolvedError = appError ?? new InternalError();
    const problem = resolvedError.toProblem(req.requestId);

    res.status(problem.status).json(problem);
  };
}
