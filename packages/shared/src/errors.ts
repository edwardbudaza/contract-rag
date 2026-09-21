// AppError hierarchy — the runtime counterpart of docs/architecture/error-model.md.
// Every thrown error that should reach the client goes through one of these subclasses;
// anything else is treated as an unexpected 500 by the error-handling middleware
// (apps/api/src/middleware/errorHandler.ts) and never leaks its message to the client.

export type ProblemType =
  | "validation-error"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "ungrounded-answer"
  | "rate-limited"
  | "internal-error"
  | "upstream-unavailable";

// Named distinctly from schemas.ts's `Problem` (the Zod schema/inferred type for the same
// wire shape) to avoid an export collision on `export * from` in index.ts — both describe
// the same JSON shape from two different angles: this one is what AppError.toProblem()
// returns; schemas.ts's is what client code would validate a response body against.
export interface ProblemResponse {
  type: string;
  title: string;
  detail?: string;
  status: number;
  requestId?: string;
}

const BASE_URI = "https://contract-rag.dev/errors";

export abstract class AppError extends Error {
  abstract readonly type: ProblemType;
  abstract readonly status: number;

  constructor(
    public readonly title: string,
    public readonly detail?: string,
  ) {
    super(title);
    this.name = new.target.name;
  }

  toProblem(requestId?: string): ProblemResponse {
    return {
      type: `${BASE_URI}/${this.type}`,
      title: this.title,
      detail: this.detail,
      status: this.status,
      requestId,
    };
  }
}

export class ValidationError extends AppError {
  readonly type = "validation-error" as const;
  readonly status = 400;
  constructor(detail: string) {
    super("Validation failed", detail);
  }
}

export class UnauthorizedError extends AppError {
  readonly type = "unauthorized" as const;
  readonly status = 401;
  constructor(detail = "Missing or invalid credentials") {
    super("Unauthorized", detail);
  }
}

export class ForbiddenError extends AppError {
  readonly type = "forbidden" as const;
  readonly status = 403;
  constructor(detail = "You do not have access to this resource") {
    super("Forbidden", detail);
  }
}

// Per docs/architecture/error-model.md §3: resources scoped to an owner return 404, not 403,
// when they exist but belong to someone else — this IS that 404, not a generic "missing" one.
export class NotFoundError extends AppError {
  readonly type = "not-found" as const;
  readonly status = 404;
  constructor(resource = "Resource") {
    super(`${resource} not found`);
  }
}

export class ConflictError extends AppError {
  readonly type = "conflict" as const;
  readonly status = 409;
  constructor(detail: string) {
    super("Conflict", detail);
  }
}

export class UngroundedAnswerError extends AppError {
  readonly type = "ungrounded-answer" as const;
  readonly status = 422;
  constructor(
    detail = "Retrieval found no context to ground an answer in",
  ) {
    super("Cannot answer from available context", detail);
  }
}

export class RateLimitedError extends AppError {
  readonly type = "rate-limited" as const;
  readonly status = 429;
  constructor(detail = "Too many requests") {
    super("Rate limited", detail);
  }
}

export class InternalError extends AppError {
  readonly type = "internal-error" as const;
  readonly status = 500;
  constructor() {
    // detail is intentionally never set — see error-model.md §4: never leak internals.
    super("Internal server error");
  }
}

export class UpstreamUnavailableError extends AppError {
  readonly type = "upstream-unavailable" as const;
  readonly status = 502;
  constructor(service: string) {
    super("Upstream service unavailable", `${service} is currently unreachable`);
  }
}
