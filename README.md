# Contract Analysis RAG

Production-style Contract Intelligence platform. Node.js + TypeScript, Express, PostgreSQL,
Cloudflare R2, Qdrant, LangChain, Gemini, BullMQ/Redis-Valkey — fully asynchronous, observable,
and tested. See `docs/architecture/architecture.md` for the full system design.

## Status

**Phase 0 — Architecture & Contracts** and **Phase 1 — Production Foundation** are complete.

### Phase 0 — Architecture & Contracts

| Task | Deliverable | Location |
|---|---|---|
| P0-01 Target architecture | System design, execution paths, component responsibilities | `docs/architecture/architecture.md` |
| P0-02 Domain model | User, Contract, ContractVersion, IngestionJob, ContractAnalysis, Conversation, Message | `docs/architecture/domain-model.md` |
| P0-03 Database schema | ERD + executable DDL | `docs/architecture/database-schema.md`, `packages/database/migrations/0001_init.sql` |
| P0-04 API contracts | Auth/contracts/documents/analysis/chat endpoints | `docs/api/api-contracts.md`, `docs/api/openapi.yaml`, `packages/shared/src/schemas.ts` |
| P0-05 Error model | RFC 7807 shape, error taxonomy, logging rules | `docs/architecture/error-model.md` |
| P0-06 Configuration strategy | Zod-validated env, secrets policy | `docs/operations/configuration.md`, `packages/config/src/env.ts`, `.env.example` |
| P0-07 ADR structure | Template + six accepted decisions | `docs/decisions/` |
| P0-08 Repository structure | Phase 0 scaffold | — |

### Phase 1 — Production Foundation

| Deliverable | What it is | Location |
|---|---|---|
| Error handling | `AppError` hierarchy + Express error/404 middleware, RFC 7807 responses | `packages/shared/src/errors.ts`, `apps/api/src/middleware/` |
| Request validation | Generic Zod-based `validate()` middleware | `apps/api/src/middleware/validate.ts` |
| Correlation IDs | Per-request `requestId`, echoed as `x-request-id` | `apps/api/src/middleware/requestId.ts` |
| Configuration | `parseEnv()` split out for testability | `packages/config/src/env.ts` |
| PostgreSQL | Connection pool, migration runner, `GET /ready` wired to a real ping | `packages/database/src/{pool,migrate,bin}.ts` |
| Docker | Multi-stage images for `api`/`worker`, full local stack | `apps/api/Dockerfile`, `apps/worker/Dockerfile`, `docker-compose.yml` |
| Test framework | Jest + ts-jest, 30 real tests (unit + a live-Postgres integration suite) | `jest.config.js`, `tests/unit/`, `tests/integration/` |
| CI | Postgres service container, migrations + integration tests on every PR | `.github/workflows/ci.yml` |

## Repository Structure

```text
contract-rag/
├── apps/
│   ├── api/        # Express API (controllers → services → repositories)
│   ├── worker/      # BullMQ consumers (document/embedding/analysis/cleanup)
│   └── web/         # Next.js client (Phase 16)
├── packages/
│   ├── database/    # pool.ts, migrate.ts, bin.ts + migrations/0001_init.sql
│   ├── config/       # Centralized, Zod-validated env config
│   ├── shared/       # Zod request/response schemas shared by api/worker/web
│   ├── queue/        # BullMQ queue definitions (Phase 3)
│   ├── observability/# Pino / OpenTelemetry / Sentry wiring (Phase 2)
│   └── rag/          # LangChain pipeline: ingestion/embeddings/vector-store/retrieval/analysis/chat/prompts
├── tests/
│   ├── unit/          # schemas, errors, config, middleware — no external deps
│   ├── integration/   # tests/integration/database.test.ts — runs against a real Postgres
│   └── rag/ security/ e2e/  # from Phase 3+
├── docs/
│   ├── architecture/ # architecture.md, domain-model.md, database-schema.md, error-model.md
│   ├── api/          # api-contracts.md, openapi.yaml
│   ├── decisions/    # ADR template + ADR-001..006
│   └── operations/   # configuration.md
├── docker-compose.yml # postgres, valkey, qdrant, api, worker
├── apps/api/Dockerfile, apps/worker/Dockerfile
└── .github/workflows/ci.yml   # lint, typecheck, unit + integration tests, build
```

## Local Development

```bash
cp .env.example .env       # fill in real values before running against live infra
npm install
docker compose up -d postgres valkey qdrant   # infra only — api/worker run via npm below
npm run db:migrate                            # applies packages/database/migrations/*.sql

npm run typecheck
npm run lint
npm run test:unit
npm run test:integration    # needs the postgres container above

npm run dev:api             # http://localhost:3000/health, /ready
npm run dev:worker
```

To run everything (including `api`/`worker`) in Docker instead:

```bash
docker compose up -d --build
```

## Definition of Done

Every Phase 0 task has an executable artifact (doc, schema, or config code) satisfying its own
"Acceptance" section. Phase 1 is done when `npm run lint`, `npm run typecheck`,
`npm run test:unit`, `npm run test:integration` (against a running Postgres), and
`npm run build` all pass clean — exactly what `.github/workflows/ci.yml` checks on every PR.

## Contributing

Branch flow: `feature/<n>-<name>` → PR into `develop` → CodeRabbit + GitHub Actions CI → review
→ merge. See `.github/workflows/ci.yml` for what CI checks on every PR.
