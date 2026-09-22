// IMPORTANT: this import MUST be first — before config, before ./app, before anything else.
// See apps/api/src/instrumentation.ts and packages/observability/src/tracing/index.ts for
// exactly why: OpenTelemetry auto-instrumentation patches modules (express, pg, http) at
// require-time, so it has to run before any of them are required anywhere in the process.
import "./instrumentation";

import { config } from "@contract-rag/config";
import { createApp } from "./app";
import { closePool } from "@contract-rag/database";
import { logger as loggerModule, tracing } from "@contract-rag/observability";

const logger = loggerModule.createLogger("contract-rag-api");
const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ event: "server.started", port: config.PORT, env: config.NODE_ENV });
});

// Graceful shutdown: stop accepting new connections, let in-flight requests finish, THEN
// close the database pool and flush any buffered trace spans — in that order, so a request
// that's mid-flight when SIGTERM arrives doesn't lose its database connection out from under
// it, and so the last few spans/logs from shutdown itself actually get exported.
async function shutdown(signal: string) {
  logger.info({ event: "server.shutting_down", signal });
  server.close(async () => {
    await closePool();
    await tracing.shutdownTracing();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
