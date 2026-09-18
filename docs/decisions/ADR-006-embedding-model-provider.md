# ADR-006: Embedding Model / Provider

Status: Accepted
Date: 2026-09-18

## Context

Document chunks need vector embeddings for retrieval. Options: cloud embedding APIs (Google
Gemini, OpenAI) or self-hosted open models.

## Decision

Use Google Gemini's embedding API for both chunk embeddings and LLM completions (analysis +
chat), accessed through a single `GeminiEmbeddings` service in `packages/rag/src/embeddings/` —
never called ad hoc from elsewhere. The `model` and `embeddingModel` used are recorded on every
`contract_analysis` row (`docs/architecture/database-schema.md`) and referenced through the
Prompt Registry (Phase 11), so a future model swap doesn't invalidate the ability to explain past
results.

## Consequences

- Hard dependency on Google's API — latency and cost must be monitored (RAG metrics in
  `docs/architecture/architecture.md` §15).
- `GEMINI_API_KEY` is a required, validated config value (`packages/config/src/env.ts`) and must
  never be logged (`docs/architecture/error-model.md` §4).
- A Gemini outage must degrade gracefully rather than mark the whole API unhealthy — `/ready`
  intentionally excludes Gemini (`docs/api/api-contracts.md`).
- Swapping models later means bumping `embeddingModel` in the Prompt Registry, not a schema
  migration — re-embedding is a data migration, not a breaking change.

## Alternatives Considered

- **OpenAI embeddings** — good performance, but adds a second AI vendor's data-handling terms
  for legal-document content without a clear benefit at this stage; deferred.
- **Self-hosted open embedding models** — rejected for now: requires GPU infrastructure we don't
  operate yet; revisit if Gemini cost/latency becomes prohibitive.

## Links

- `docs/architecture/database-schema.md` (`contract_analysis.model`, `.embedding_model`)
- Implementation plan §25 (Prompt Versioning), Phase 8/11
