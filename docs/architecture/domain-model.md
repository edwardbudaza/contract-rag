# Domain Model

Status: Approved | Depends on: P0-01 | Feeds: P0-03 (schema), P0-04 (API contracts)

Defines the seven core business entities and how they relate. This is the domain model —
business meaning and relationships — the physical PostgreSQL schema derived from it lives in
`docs/architecture/database-schema.md` / `packages/database/schema.sql`.

## 1. Entity Overview

```text
User 1───* Contract 1───* ContractVersion 1───* IngestionJob
                                    │
                                    1
                                    │
                                    *
                              ContractAnalysis

User 1───* Conversation *───1 Contract
Conversation 1───* Message
```

## 2. Entities

### User
The authenticated account that owns contracts and conversations.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| email | string | unique |
| passwordHash | string | never logged, never returned |
| createdAt | timestamp | |

### Contract
A logical document the user is tracking. Has zero or more versions (re-uploads count as new
versions, not new contracts).

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| ownerId | UUID | FK → User |
| title | string | |
| status | enum | `UPLOADING`, `PROCESSING`, `ANALYZING`, `READY`, `FAILED`, `DELETED` (see lifecycle in architecture.md §3) |
| createdAt | timestamp | |

### ContractVersion
One uploaded file for a Contract. Ingestion, chunking, embedding, and analysis are all scoped
to a version, not the contract as a whole — re-uploads never mutate prior analysis.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| contractId | UUID | FK → Contract |
| fileName / fileType / fileSize | string/string/int | |
| storageKey | string | R2 object key |
| status | enum | `PENDING`, `PROCESSING`, `INDEXED`, `FAILED` |
| uploadedAt | timestamp | |

### IngestionJob
The business-level record of one async operation (extraction, embedding, or analysis) against
a ContractVersion. BullMQ owns *execution*-level queue state; this table owns *business*-level
state and is what the API reads to answer "what's the status?" (see architecture.md §3).

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| contractVersionId | UUID | FK |
| type | enum | `EXTRACTION`, `EMBEDDING`, `ANALYSIS`, `CLEANUP` |
| status | enum | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `DEAD` |
| retries | int | |
| lastError | string, nullable | never contains document content |
| createdAt / updatedAt | timestamp | |

### ContractAnalysis
The structured, Gemini-generated, Zod-validated output for a ContractVersion.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| contractVersionId | UUID | FK, unique per version |
| jobId | UUID | FK → IngestionJob (the ANALYSIS job that produced it) |
| model | string | e.g. `gemini-1.5-pro` |
| promptVersion | string | FK-like reference into Prompt Registry |
| result | jsonb | summary, parties, obligations, paymentTerms, importantDates, termination, governingLaw, riskyClauses[], missingProtections[], evidence[] |
| createdAt | timestamp | |

### Conversation
A chat thread scoped to one Contract.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User |
| contractId | UUID | FK → Contract |
| startedAt | timestamp | |

### Message
One turn in a Conversation.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| conversationId | UUID | FK |
| sender | enum | `user`, `assistant` |
| content | text | |
| sources | jsonb, nullable | retrieval evidence for assistant turns |
| createdAt | timestamp | |

## 3. Invariants

- A ContractVersion's analysis is immutable once written; a re-analysis creates a new
  `ContractAnalysis` row rather than overwriting (reproducibility — see ADR context in
  `docs/decisions/`).
- Deleting a Contract cascades logically (Postgres → R2 → Qdrant → queued jobs) but is itself
  asynchronous (`cleanup` queue), so `Contract.status = DELETED` may briefly outlive the
  underlying data.
- Every retrieval-bearing query is scoped by `(userId, contractId, [versionId])` — never by
  `contractId` alone.

## 4. Acceptance

Satisfies P0-02: User, Contract, ContractVersion, IngestionJob, ContractAnalysis, Conversation,
and Message are fully defined with fields and relationships.
