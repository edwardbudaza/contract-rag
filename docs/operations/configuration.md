# Configuration Strategy

Status: Approved | Implements in: `packages/config/src/env.ts`

## 1. Approach

12-factor style: all configuration comes from environment variables, validated once at process
startup via Zod (`packages/config`), never accessed as raw `process.env` anywhere else in the
codebase. A missing or malformed variable **crashes the process immediately** on boot rather
than failing confusingly mid-request.

```ts
// anywhere else in the app
import { config } from "@contract-rag/config";
config.DATABASE_URL   // typed, validated, not process.env.DATABASE_URL
```

## 2. Required Variables (Phase 0 set)

| Variable | Validation | Notes |
|---|---|---|
| `NODE_ENV` | enum: `development`, `test`, `production` | |
| `PORT` | positive int | API listen port |
| `DATABASE_URL` | url | PostgreSQL connection string |
| `REDIS_URL` | url | Redis/Valkey, backs BullMQ |
| `QDRANT_URL` | url | |
| `QDRANT_API_KEY` | string, min 1 | |
| `R2_ENDPOINT` | url | |
| `R2_ACCESS_KEY_ID` | string, min 1 | |
| `R2_SECRET_ACCESS_KEY` | string, min 1 | never logged |
| `R2_BUCKET` | string, min 1 | |
| `GEMINI_API_KEY` | string, min 1 | never logged |
| `JWT_SECRET` | string, min 32 | signs auth tokens |
| `SENTRY_DSN` | url, optional | disabled in `development` if unset |

See `.env.example` for the local-dev template and `packages/config/src/env.ts` for the
executable schema.

## 3. Environments

- **development**: `.env` file (git-ignored), loaded via `dotenv` before the Zod parse.
- **test**: `.env.test`, points at containerized/ephemeral infra (see Phase 3 integration test
  strategy in the implementation plan §34).
- **production**: variables injected by the deploy platform / a secrets manager — never a
  committed file. Recommended: Vault, AWS Secrets Manager, or the hosting platform's native
  secret store (exact choice deferred; see `docs/decisions/` if/when an ADR is written for it).

## 4. Secret Handling Rules

- No secret is ever committed, logged, or included in a Sentry event (cross-reference
  `error-model.md` §4).
- `.env` and `.env.*` (except `.env.example`) are git-ignored from repo scaffolding onward
  (§ repository structure).
- Rotation: documented per-provider as each integration is built (R2/Gemini/Qdrant in Phases
  6–8); Phase 0 only fixes *where* secrets live, not a rotation schedule.

## 5. Acceptance

Satisfies P0-06: configuration is centralized (`packages/config`), validated with Zod at boot
(`env.ts`), and documented above with defaults/examples (`.env.example`).
