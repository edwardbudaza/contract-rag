// Mounted after every route. Anything that reaches this point matched no route, so it
// becomes a proper 404 Problem instead of Express's default HTML error page.

import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "@contract-rag/shared";

export function notFound() {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError("Route"));
  };
}
