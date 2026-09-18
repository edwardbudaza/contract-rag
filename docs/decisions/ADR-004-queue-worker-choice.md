# ADR-004: Queue / Worker Choice

Status: Accepted
Date: 2026-09-18

## Context

Document extraction, embedding, and analysis are expensive and must not run inside the HTTP
request lifecycle (`docs/architecture/architecture.md` §3). We need a reliable job queue with
retries, backoff, and concurrency control. Options: Redis-based queues (BullMQ, BeeQueue) or a
message broker (RabbitMQ, Kafka).

## Decision

Use **BullMQ on Redis/Valkey**. It is actively maintained, TypeScript-native, and provides
delayed jobs, exponential backoff, per-queue concurrency, and job state out of the box — a
strong match for a single Node/TS stack at our current scale. Four logical queues are defined
(`contract-processing`, `embedding`, `contract-analysis`, `cleanup`) rather than one shared
queue, so failure/retry/concurrency policy can differ per workload.

BullMQ owns **execution-level** queue state; PostgreSQL's `ingestion_jobs` table
(`docs/architecture/database-schema.md`) owns **business-level** job state. The two are related
but deliberately not the same record — the API answers "what's the status?" from Postgres, never
by querying Redis directly.

## Consequences

- Redis/Valkey becomes a hard dependency for both the API (enqueue) and worker (consume); it
  must be included in `/ready` checks (`docs/api/api-contracts.md`).
- Job idempotency is mandatory: retries must not create duplicate chunks/vectors/analyses (the
  `uq_ingestion_jobs_inflight` unique index in `schema.sql` is the first line of defense).
- If throughput needs outgrow a single Redis instance, this decision is revisited — not expected
  before Phase 13+.

## Alternatives Considered

- **RabbitMQ** — rejected: separate server/protocol, more operational surface than justified.
- **Kafka** — rejected: overkill for our job volume; adds a second stateful system to operate.

## Links

- `docs/architecture/architecture.md` §3 (execution paths), §5–8 of the implementation plan
