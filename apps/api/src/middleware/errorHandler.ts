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
//     server-side via Pino (never console.error, as of Phase 2) and, for 5xx-class errors
//     only, reported to Sentry

import type { NextFunction, Request, Response } from "express";
import { AppError, InternalError } from "@contract-rag/shared";
import { sentry, type Logger } from "@contract-rag/observability";

export function errorHandler(logger: Logger) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const appError = err instanceof AppError ? err : null;
    const resolvedError = appError ?? new InternalError();
    const problem = resolvedError.toProblem(req.requestId);

    // 4xx (validation, not-found, conflict, ...) are expected, routine traffic — logging
    // them at error level and paging Sentry for every mistyped URL would be pure noise.
    // 5xx means something is actually broken: an unhandled exception, or an AppError that
    // itself represents an operational failure (UpstreamUnavailableError, InternalError).
    if (problem.status >= 500) {
      logger.error(
        {
          event: "request.failed",
          requestId: req.requestId,
          route: req.path,
          errorType: problem.type,
          // Only present for genuinely unexpected errors — an AppError's message IS its
          // client-safe title, never a raw stack; see error-model.md §4.
          stack: !appError && err instanceof Error ? err.stack : undefined,
        },
        !appError && err instanceof Error ? err.message : problem.title,
      );
      sentry.captureException(appError ?? err, { requestId: req.requestId, route: req.path });
    }

    res.status(problem.status).json(problem);
  };
}
