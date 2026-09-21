import express from "express";
import request from "supertest";
import { metrics } from "@contract-rag/observability";
import { metricsMiddleware } from "../../../apps/api/src/middleware/metrics";

// The registry (packages/observability/src/metrics) is a module-level singleton, shared by
// every test in this file — reset it before each test so counters from one test don't leak
// into the assertions of the next.
beforeEach(() => {
  metrics.httpRequestsTotal.reset();
  metrics.httpRequestDurationSeconds.reset();
});

function buildTestApp() {
  const app = express();
  app.use(metricsMiddleware());
  app.get("/widgets", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  return app;
}

describe("metricsMiddleware", () => {
  it("records a request in both the counter and the duration histogram", async () => {
    const app = buildTestApp();
    await request(app).get("/widgets");

    const text = await metrics.registry.metrics();
    expect(text).toContain('http_requests_total{method="GET"');
    expect(text).toContain('route="/widgets"');
    expect(text).toContain('status_code="200"');
    expect(text).toContain("http_request_duration_seconds");
  });

  it("skips /health — no metric recorded for it", async () => {
    const app = buildTestApp();
    await request(app).get("/health");

    const text = await metrics.registry.metrics();
    expect(text).not.toContain('route="/health"');
  });

  it("includes default Node process metrics (collectDefaultMetrics)", async () => {
    const text = await metrics.registry.metrics();
    // process_cpu_user_seconds_total is one of prom-client's standard default metrics —
    // its presence confirms collectDefaultMetrics() actually ran against our registry.
    expect(text).toContain("process_cpu_user_seconds_total");
  });
});
