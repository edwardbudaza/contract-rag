# ADR-001: API Contract Style

Status: Accepted
Date: 2026-09-18

## Context

Modern API design offers REST (OpenAPI), GraphQL, or gRPC. We need a contract-first approach so
the frontend, backend, and tests can be built against a stable, shared definition before
implementation begins, and so async endpoints (which return `202` + a job handle rather than a
final result) are easy to express.

## Decision

Use a RESTful HTTP API specified via OpenAPI 3.0 (`docs/api/openapi.yaml`), mirrored by Zod
schemas in `packages/shared/src/schemas.ts` for runtime validation. This fits our Node/Express
stack, needs no code-generation toolchain to get started, and keeps the async-job pattern
(`202 Accepted` + polling `GET /status`) simple to model.

## Consequences

- We get a versioned, reviewable API spec early (`/api/v1` prefix from day one).
- Client SDKs/docs can be generated from `openapi.yaml` later without extra design work.
- We forgo GraphQL's single-endpoint flexible querying and gRPC's binary performance — neither
  is needed at our current scale, and both add operational complexity we don't want yet.

## Alternatives Considered

- **GraphQL** — rejected: we prefer backend-controlled data shapes and simpler auth/rate-limiting
  per endpoint over client-driven queries.
- **gRPC** — rejected: JS/TS gRPC tooling is heavier, and our clients (Next.js web, eventually
  mobile) are better served by plain JSON over HTTP.

## Links

- `docs/api/openapi.yaml`
- `docs/api/api-contracts.md`
