// Worker process entry point.
// Phase 0: scaffolding only. Real queue consumers (document/embedding/analysis/cleanup)
// are implemented starting Phase 3 (queue infra) and Phase 7+ (RAG pipeline), consuming the
// four logical queues defined in docs/architecture/architecture.md §3:
//   contract-processing | embedding | contract-analysis | cleanup
//
// Workers must be idempotent — see docs/architecture/database-schema.md §3 for the
// in-flight-job uniqueness guard that backs this.

import { config } from "@contract-rag/config";

// eslint-disable-next-line no-console
console.log(`Worker booting (${config.NODE_ENV}) — no queues registered yet (Phase 0).`);
