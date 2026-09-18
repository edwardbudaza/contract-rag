import { config } from "@contract-rag/config";
import { createApp } from "./app";

const app = createApp();

app.listen(config.PORT, () => {
  // Structured logging (Pino) replaces this in Phase 2 — see docs/decisions/ADR-005.
  // eslint-disable-next-line no-console
  console.log(`API listening on :${config.PORT} (${config.NODE_ENV})`);
});
