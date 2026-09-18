# ADR-003: Storage Abstraction

Status: Accepted
Date: 2026-09-18

## Context

We need durable, scalable storage for original uploaded contract documents (PDFs/Word files).
Options: an S3-compatible object store (Cloudflare R2, AWS S3), a database blob column, or the
local filesystem.

## Decision

Use Cloudflare R2 (S3-compatible) for original document bytes, accessed only behind an
`IStorage` interface in `packages/shared` (upload, download, delete, presigned-URL generation).
Uploads use pre-signed URLs (`POST /contracts/:id/documents` returns `uploadUrl` — see
`docs/api/api-contracts.md`) so large files never transit the API process. Application code
never calls the R2 SDK directly outside the storage package, so swapping providers later touches
one module.

## Consequences

- Scalable, durable storage with no API-process memory pressure from large uploads.
- R2's S3 compatibility lets us use standard S3 client libraries and tooling.
- We own credential security for `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
  (`docs/operations/configuration.md`) and must validate MIME type and size **before** issuing an
  upload URL (`CreateDocumentBody` in `packages/shared/src/schemas.ts` caps size at 50MB and
  whitelists PDF/Word MIME types).

## Alternatives Considered

- **PostgreSQL blob column** — rejected: inefficient for multi-MB binary files and bloats
  backups/replication.
- **Local filesystem** — rejected: not scalable across worker/API replicas, no durability
  guarantee.

## Links

- `docs/architecture/database-schema.md` (`contract_versions.storage_key`)
- `packages/shared/src/schemas.ts` (`CreateDocumentBody`)
