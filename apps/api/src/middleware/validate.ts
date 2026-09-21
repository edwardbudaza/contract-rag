// Generic request-validation middleware. Wraps any Zod schema and validates the matching
// part of the request, replacing it with the parsed (typed, defaulted, coerced) value on
// success, or forwarding a ValidationError to the error handler on failure — so every route
// gets the same 400 Problem shape for bad input, per docs/architecture/error-model.md.

import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ValidationError } from "@contract-rag/shared";

interface ValidationTargets {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

export function validate(targets: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const [key, schema] of Object.entries(targets) as [
      keyof ValidationTargets,
      ZodTypeAny | undefined,
    ][]) {
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(new ValidationError(formatIssues(result.error.issues)));
      }
      // Replace with the parsed value so defaults/coercions (e.g. PaginationQuery's
      // `limit` default, `z.coerce.number()`) are what the rest of the request sees.
      (req as unknown as Record<string, unknown>)[key] = result.data;
    }
    next();
  };
}
