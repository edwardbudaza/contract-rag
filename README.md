# Contract Analysis RAG

Production-style Contract Intelligence platform. Node.js + TypeScript, Express, PostgreSQL,
Cloudflare R2, Qdrant, LangChain, Gemini, BullMQ/Redis-Valkey — fully asynchronous, observable,
and tested. See `docs/architecture/architecture.md` for the full system design.

## Status

**Phase 0 — Architecture & Contracts** is complete. Nothing here is wired to real
infrastructure yet; this phase establishes the shared design every later phase builds on.

| Task | Deliverable | Location |
|---|---|---|
| P0-01 Target architecture | System design, execution paths, component responsibilities | `docs/architecture/architecture.md` |
| P0-02 Domain model | User, Contract, ContractVersion, IngestionJob, ContractAnalysis, Conversation, Message | `docs/architecture/domain-model.md` |
| P0-03 Database schema | ERD + executable DDL | `docs/architecture/database-schema.md`, `packages/database/schema.sql` |
| P0-04 API contracts | Auth/contracts/documents/analysis/chat endpoints | `docs/api/api-contracts.md`, `docs/api/openapi.yaml`, `packages/shared/src/schemas.ts` |
| P0-05 Error model | RFC 7807 shape, error taxonomy, logging rules | `docs/architecture/error-model.md` |
| P0-06 Configuration strategy | Zod-validated env, secrets policy | `docs/operations/configuration.md`, `packages/config/src/env.ts`, `.env.example` |
| P0-07 ADR structure | Template + six accepted decisions | `docs/decisions/` |
| P0-08 Repository structure | This scaffold | see below |

## Repository Structure

```text
contract-rag/
├── apps/
│   ├── api/        # Express API (controllers → services → repositories)
│   ├── worker/      # BullMQ consumers (document/embedding/analysis/cleanup)
│   └── web/         # Next.js client (Phase 16)
├── packages/
│   ├── database/    # PostgreSQL schema (packages/database/schema.sql)
│   ├── config/       # Centralized, Zod-validated env config
│   ├── shared/       # Zod request/response schemas shared by api/worker/web
│   ├── queue/        # BullMQ queue definitions (Phase 3)
│   ├── observability/# Pino / OpenTelemetry / Sentry wiring (Phase 2)
│   └── rag/          # LangChain pipeline: ingestion/embeddings/vector-store/retrieval/analysis/chat/prompts
├── tests/
│   ├── unit/ integration/ rag/ security/ e2e/
├── docs/
│   ├── architecture/ # architecture.md, domain-model.md, database-schema.md, error-model.md
│   ├── api/          # api-contracts.md, openapi.yaml
│   ├── decisions/    # ADR template + ADR-001..006
│   └── operations/   # configuration.md
├── docker-compose.yml # postgres, valkey, qdrant for local dev
└── .github/workflows/ci.yml
```

## Local Development

```bash
cp .env.example .env       # fill in real values before running against live infra
docker compose up -d       # postgres, valkey, qdrant
npm install
npm run typecheck
npm run lint
npm run dev:api             # http://localhost:3000/health, /ready
npm run dev:worker
```

## Definition of Done (Phase 0)

Every task above has an executable artifact (doc, schema, or config code) and satisfies the
acceptance criteria in the Phase 0 task breakdown — see each linked file's own "Acceptance"
section for the specific criterion it closes.

## Contributing

Branch flow: `feature/<n>-<name>` → PR into `develop` → CodeRabbit + GitHub Actions CI → review
→ merge. See `.github/workflows/ci.yml` for what CI checks on every PR.
