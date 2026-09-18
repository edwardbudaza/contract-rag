# Architecture — Contract Analysis RAG

Status: Approved for Phase 0 | Owner: Edward | Last updated: 2026-09-18

## 1. Purpose

This document is the canonical description of the system's target architecture. It exists so
that every later phase (1–16) builds against the same shared model of the system rather than
each engineer inventing structure ad hoc. It covers the five layers referenced throughout the
implementation plan: **API, Worker, RAG, Data, and Observability**.

## 2. System Context

```text
                         ┌──────────────────────┐
                         │      Next.js Web     │
                         │       Client         │
                         └──────────┬───────────┘
                                    │ HTTPS
                                    ▼
                    ┌──────────────────────────────┐
                    │        Express API           │
                    │ Auth / Contracts / Chat       │
                    │ Validation / Rate Limiting    │
                    └──────────────┬───────────────┘
                                   │
             ┌─────────────────────┼──────────────────────┐
             ▼                     ▼                      ▼
      ┌──────────────┐     ┌──────────────┐      ┌──────────────┐
      │ PostgreSQL   │     │ Cloudflare   │      │ Redis/Valkey │
      │ Users        │     │ R2           │      │ BullMQ       │
      │ Contracts    │     │ Originals    │      │ Queues       │
      │ Jobs         │     │ Documents    │      │ Retries      │
      │ Analysis     │     └──────────────┘      └──────┬───────┘
      │ Conversations│                                    │
      └──────────────┘                                    ▼
                                             ┌────────────────────────┐
                                             │      Worker Layer      │
                                             │ Document Processing    │
                                             │ Embeddings             │
                                             │ Vector Indexing        │
                                             │ Contract Analysis      │
                                             └───────────┬────────────┘
                                                         ▼
                                          ┌──────────────────────────┐
                                          │       LangChain RAG      │
                                          │ Load→Parse→Chunk→Embed   │
                                          │ →Retrieve→Rerank→Analyze │
                                          └────────────┬─────────────┘
                                                       │
                           ┌───────────────────────────┼───────────────────┐
                           ▼                           ▼                   ▼
                    ┌─────────────┐            ┌──────────────┐    ┌──────────────┐
                    │   Gemini    │            │   Qdrant     │    │  Prompt      │
                    │ LLM/Embed   │            │ Vectors+Meta │    │  Registry    │
                    └─────────────┘            └──────────────┘    └──────────────┘
```

Cross-cutting: **Pino** (logs), **OpenTelemetry** (traces), **Prometheus metrics**, **Sentry**
(errors), all correlated by `requestId` / `jobId` / `traceId`.

## 3. Execution Paths

The system has exactly four execution paths, and every feature must be classified into one of
them before it is implemented:

| Path | Trigger | Example | Must NOT do |
|---|---|---|---|
| **Synchronous API** | HTTP request | login, get contract, get analysis | PDF parsing, embeddings, LLM calls |
| **Asynchronous processing** | Job enqueued by API | upload → ingestion → embedding → analysis | Block the HTTP request thread |
| **Worker** | BullMQ job consumer | `document.worker.ts`, `analysis.worker.ts` | Own business logic not shared with API |
| **Observability** | Side-effect of the above | logs, traces, metrics, Sentry events | Contain document content or secrets |

Rule: **HTTP is for interaction. Queues are for work. Workers do expensive processing.**
Anything that calls Gemini, extracts a PDF, chunks text, or writes to Qdrant is asynchronous —
no exceptions, including for "quick" documents.

## 4. Component Responsibilities

| Component | Responsibility | Does NOT own |
|---|---|---|
| Express API | AuthN/AuthZ, validation, thin controllers, enqueueing jobs, reading persisted state | Long-running work |
| Worker processes | Consuming BullMQ jobs, running the RAG pipeline, writing results back | HTTP concerns |
| PostgreSQL | Business-level source of truth: users, contracts, jobs, analyses, conversations | Vector search, file bytes |
| Cloudflare R2 | Original document bytes | Structured/queryable data |
| Redis/Valkey + BullMQ | Queue transport, retries, backoff, scheduling | Business-level job status (Postgres owns that) |
| Qdrant | Vectors + retrieval metadata payload | Tenant enforcement UI, business state |
| Gemini | LLM completions + embeddings | Prompt versioning (Prompt Registry owns that) |
| LangChain | Orchestration of load→parse→chunk→embed→retrieve→generate | Should not become the architecture itself |

## 5. Tenancy & Isolation

Every retrieval and every row read enforces `userId = authenticated user AND
contractId = requested contract`, applied at the application layer — never relying on the
frontend, and never relying solely on a Qdrant payload filter (see `docs/architecture/error-model.md`
and ADR-002/ADR-003 for the security implications).

## 6. Non-Goals for Phase 0

- No implementation code beyond scaffolding/config stubs.
- No live Gemini/Qdrant/R2 credentials wired up.
- No UI.

## 7. Acceptance

This document satisfies P0-01: it reflects the API, worker, RAG, data, and observability
layers, and is the reference all subsequent ADRs and schemas point back to.
