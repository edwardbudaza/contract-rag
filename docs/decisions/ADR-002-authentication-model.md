# ADR-002: Authentication Model

Status: Accepted
Date: 2026-09-18

## Context

We need user authentication and per-resource authorization. Options: stateless JWT bearer
tokens vs. server-side session cookies; simple ownership checks vs. full RBAC.

## Decision

Use stateless JWT (Bearer token) authentication with an auth middleware in the Express API.
Users receive a JWT on login/register (`docs/api/openapi.yaml` → `/auth/login`,
`/auth/register`), send it via `Authorization: Bearer <token>`, and the middleware attaches
`userId` to the request context. Authorization is ownership-based (`resource.ownerId ===
request.userId`), not full RBAC — there is one role for now. Ownership failures return `404`,
not `403`, per the error model (`docs/architecture/error-model.md` §3), to avoid confirming a
resource's existence to a non-owner.

## Consequences

- No server-side session store — the API scales horizontally without shared session state.
- Token revocation requires care: we rely on short expiry (recommend ≤ 24h access tokens) rather
  than a blacklist for Phase 0; a revocation list is a Phase 12 hardening candidate if needed.
- `JWT_SECRET` becomes a hard dependency of `packages/config` (`docs/operations/configuration.md`).

## Alternatives Considered

- **Server-side sessions** — rejected: requires a Redis session store and complicates horizontal
  scaling for no benefit at our current auth complexity.
- **OAuth / external identity providers** — rejected for Phase 0: no external logins are
  required yet; revisit if social login becomes a requirement.

## Links

- `docs/api/openapi.yaml` (`bearerAuth` security scheme)
- `docs/architecture/error-model.md` §3
