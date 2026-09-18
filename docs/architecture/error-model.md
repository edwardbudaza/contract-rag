# Error Model

Status: Approved | Depends on: P0-04

## 1. Wire Format

Every non-2xx API response body follows **RFC 7807 (Problem Details for HTTP APIs)**:

```json
{
  "type": "https://contract-rag.dev/errors/validation-error",
  "title": "Validation failed",
  "detail": "email must be a valid email address",
  "status": 400,
  "requestId": "9c1b1e2e-..."
}
```

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Stable URI identifying the error kind; used for client-side branching, never parsed from `title` |
| `title` | yes | Short, human-readable, safe to show a user |
| `detail` | no | More specific explanation; must never contain a stack trace, secret, or raw document content |
| `status` | yes | Duplicates the HTTP status for clients that inspect body only |
| `requestId` | recommended | Correlation ID — see `docs/operations/` observability notes; lets an engineer jump from a user's bug report straight to logs/traces |

Zod schema: `packages/shared/src/schemas.ts` → `Problem`.

## 2. Standard Error Types

| `type` suffix | HTTP status | Used for |
|---|---|---|
| `validation-error` | 400 | Request body/query failed Zod validation |
| `unauthorized` | 401 | Missing/invalid/expired JWT |
| `forbidden` | 403 | Valid auth, but not the resource owner (IDOR guard) |
| `not-found` | 404 | Resource does not exist, or exists but belongs to another user (see §4) |
| `conflict` | 409 | e.g. duplicate email on register |
| `ungrounded-answer` | 422 | Chat retrieval found no supporting context; the app must not let Gemini fabricate |
| `rate-limited` | 429 | Rate limiter tripped |
| `internal-error` | 500 | Unhandled exception — `detail` is omitted entirely, only logged server-side |
| `upstream-unavailable` | 502/503 | Gemini/Qdrant/R2 failure surfaced to the caller |

New types are added here first, then implemented — the list is the contract.

## 3. Authorization Errors: 403 vs 404

To avoid leaking the existence of other users' resources, endpoints scoped to a resource
(`GET /contracts/:id`, etc.) return **404**, not 403, when the resource exists but is owned by a
different user. 403 is reserved for cases where existence is not sensitive (e.g. a feature flag
gate). This is called out explicitly because it is the single most common IDOR mistake.

## 4. Logging & Sensitive-Data Rules

Applies to every layer (API, worker, RAG), not just error responses:

**Never log or place in `detail`/Sentry context:**
- passwords, JWTs, API keys, raw `Authorization` headers
- full document text or chat message content
- environment variable values

**Always safe / encouraged:**
- `requestId`, `jobId`, `userId`, `contractId`, `versionId`, `operation`, `model`,
  `promptVersion`, HTTP status, error `type`

Sentry's `beforeSend` hook must scrub the above categories; this is a Phase 2/12 implementation
task but the rule is fixed now so nothing is built against a laxer assumption.

## 5. Worker/Job Errors

Job failures populate `ingestion_jobs.last_error` (schema in `database-schema.md`) with a short,
non-sensitive message — the same rules as above apply, since this field is readable via
`GET /contracts/:id/status`.

## 6. Acceptance

Satisfies P0-05: the error object has a consistent, documented structure (`type`, `title`,
`detail`, `status`), status-code handling is unambiguous (§2–3), and sensitive-logging rules are
defined (§4) — closing the "inadvertent leak of sensitive info" risk called out in the Phase 0
task breakdown.
