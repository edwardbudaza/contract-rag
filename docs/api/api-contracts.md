# API Contracts

Status: Approved | Depends on: P0-02, P0-05 | Machine-readable spec: `docs/api/openapi.yaml`
Zod schemas: `packages/shared/src/schemas/`

All endpoints are versioned under `/api/v1`, JSON over HTTPS, contract-first (this document and
the OpenAPI spec are authored before implementation and shared with frontend + tests).

## Conventions

- **Auth**: `Authorization: Bearer <jwt>` on every endpoint except `register`/`login`.
- **Errors**: every non-2xx response follows the RFC 7807 shape defined in
  `docs/architecture/error-model.md` — never a bespoke shape per endpoint.
- **Pagination**: list endpoints accept `?cursor=&limit=` (default 20, max 100) and return
  `{ items: [...], nextCursor: string | null }`.
- **Long-running work returns `202 Accepted`** with a job/status representation, never blocks
  for the async pipeline (architecture.md §3).

## Auth

```text
POST /api/v1/auth/register
  req:  { email: string, password: string (min 8) }
  201:  { userId: string, token: string }
  errs: 400 (validation), 409 (email exists)

POST /api/v1/auth/login
  req:  { email: string, password: string }
  200:  { userId: string, token: string }
  errs: 401 (invalid credentials)

GET /api/v1/auth/me   (auth)
  200: { userId: string, email: string }
```

## Contracts

```text
POST /api/v1/contracts   (auth)
  req:  { title: string }
  201:  { contractId: string, status: "UPLOADING" }
  errs: 400, 401

GET /api/v1/contracts   (auth)
  200: { items: [{ contractId, title, status, createdAt }], nextCursor }

GET /api/v1/contracts/:id   (auth)
  200:  { contractId, title, status, createdAt, versions: [...] }
  errs: 401, 403 (not owner), 404

DELETE /api/v1/contracts/:id   (auth)
  202:  { contractId, status: "DELETED" }   -- cleanup queue coordinates PG/R2/Qdrant
  errs: 401, 403, 404
```

## Documents

```text
POST /api/v1/contracts/:id/documents   (auth)
  req:  { fileName: string, fileType: string, fileSize: number }
  202:  { versionId: string, uploadUrl: string }   -- pre-signed R2 URL, client uploads directly
  errs: 400 (invalid MIME/size), 401, 403, 404

GET /api/v1/contracts/:id/status   (auth)
  200: { contractId, status, versions: [{ versionId, status, jobs: [{ type, status }] }] }
  errs: 401, 403, 404
```

## Analysis

```text
POST /api/v1/contracts/:id/analyze   (auth)
  req:  { versionId?: string }   -- defaults to latest indexed version
  202:  { jobId: string }        -- enqueues if not already available/in-flight
  errs: 400 (version not indexed), 401, 403, 404

GET /api/v1/contracts/:id/analysis   (auth)
  200:  { analysisId, versionId, model, promptVersion, result: { summary, parties,
          obligations, paymentTerms, importantDates, termination, governingLaw,
          riskyClauses[], missingProtections[], evidence[] }, createdAt }
  errs: 401, 403, 404 (no analysis yet)
```

## Chat

```text
POST /api/v1/contracts/:id/conversations   (auth)
  req:  { }
  201:  { conversationId: string }
  errs: 401, 403, 404

GET /api/v1/contracts/:id/conversations   (auth)
  200: { items: [{ conversationId, startedAt }], nextCursor }

POST /api/v1/conversations/:id/messages   (auth)
  req:  { question: string }
  200:  { answer: string, sources: [{ page, section, chunkId, snippet }] }
  errs: 400, 401, 403, 404, 422 (retrieval found no grounded context)

GET /api/v1/conversations/:id/messages   (auth)
  200: { items: [{ sender, content, sources, createdAt }], nextCursor }
```

## Operational

```text
GET /health   -- process alive? no auth, no dependency checks
GET /ready    -- can serve requests? checks Postgres, Redis/Valkey, Qdrant (Gemini excluded —
                 see architecture.md §32 rationale: a Gemini outage should degrade, not 503, health)
```

## Acceptance

Satisfies P0-04: auth, contracts, documents, analysis, and chat contracts are documented above
and formalized in `docs/api/openapi.yaml`.
