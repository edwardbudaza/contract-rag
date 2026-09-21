// Exercises the Phase 1 middleware stack (requestId → validate → route → notFound →
// errorHandler) the same way apps/api/src/app.ts wires it, against a small throwaway Express
// app — not the real app.ts, so this stays fast and has no Postgres dependency.

import express from "express";
import request from "supertest";
import { z } from "zod";
import { ConflictError } from "@contract-rag/shared";
import { requestId } from "../../../apps/api/src/middleware/requestId";
import { validate } from "../../../apps/api/src/middleware/validate";
import { notFound } from "../../../apps/api/src/middleware/notFound";
import { errorHandler } from "../../../apps/api/src/middleware/errorHandler";

function buildTestApp() {
  const app = express();
  app.use(requestId());
  app.use(express.json());

  app.post(
    "/widgets",
    validate({ body: z.object({ name: z.string().min(1) }) }),
    (req, res) => {
      res.status(201).json({ name: req.body.name });
    },
  );

  app.get("/conflict", () => {
    throw new ConflictError("Widget already exists");
  });

  app.get("/boom", () => {
    throw new Error("unexpected programmer error, e.g. a null pointer");
  });

  app.use(notFound());
  app.use(errorHandler());
  return app;
}

describe("middleware stack", () => {
  const app = buildTestApp();

  it("sets and echoes a request ID header on every response", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("returns a 404 Problem for an unmatched route", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.type).toBe("https://contract-rag.dev/errors/not-found");
    expect(res.body.requestId).toBeDefined();
  });

  it("passes valid input through validate() and into the route", async () => {
    const res = await request(app).post("/widgets").send({ name: "gadget" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: "gadget" });
  });

  it("returns a 400 Problem with field detail for invalid input", async () => {
    const res = await request(app).post("/widgets").send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe("https://contract-rag.dev/errors/validation-error");
    expect(res.body.detail).toContain("name");
  });

  it("maps a thrown AppError to its declared status/type", async () => {
    const res = await request(app).get("/conflict");
    expect(res.status).toBe(409);
    expect(res.body.type).toBe("https://contract-rag.dev/errors/conflict");
    expect(res.body.detail).toBe("Widget already exists");
  });

  it("maps an unexpected thrown Error to a bare 500 with no leaked detail", async () => {
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.type).toBe("https://contract-rag.dev/errors/internal-error");
    expect(res.body.detail).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("null pointer");
  });
});
