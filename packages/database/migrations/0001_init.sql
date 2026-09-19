-- Contract Analysis RAG — Phase 0 schema
-- Applies to PostgreSQL 15+. See docs/architecture/database-schema.md for the ERD and rationale.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── users ────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── contracts ────────────────────────────────────────────────────────────
CREATE TYPE contract_status AS ENUM (
    'UPLOADING', 'PROCESSING', 'ANALYZING', 'READY', 'FAILED', 'DELETED'
);

CREATE TABLE contracts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    status      contract_status NOT NULL DEFAULT 'UPLOADING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contracts_owner_status ON contracts(owner_id, status);

-- ── contract_versions ────────────────────────────────────────────────────
CREATE TYPE contract_version_status AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED');

CREATE TABLE contract_versions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    file_name    TEXT NOT NULL,
    file_type    TEXT NOT NULL,
    file_size    BIGINT NOT NULL,
    storage_key  TEXT NOT NULL,          -- Cloudflare R2 object key
    status       contract_version_status NOT NULL DEFAULT 'PENDING',
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contract_versions_contract ON contract_versions(contract_id);

-- ── ingestion_jobs ───────────────────────────────────────────────────────
CREATE TYPE job_type AS ENUM ('EXTRACTION', 'EMBEDDING', 'ANALYSIS', 'CLEANUP');
CREATE TYPE job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');

CREATE TABLE ingestion_jobs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_version_id   UUID NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
    type                  job_type NOT NULL,
    status                job_status NOT NULL DEFAULT 'QUEUED',
    retries               INT NOT NULL DEFAULT 0,
    last_error            TEXT,          -- never document content; see error-model.md
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ingestion_jobs_version_status ON ingestion_jobs(contract_version_id, status);

-- Prevent duplicate concurrent jobs of the same type for the same version (idempotency guard).
CREATE UNIQUE INDEX uq_ingestion_jobs_inflight
    ON ingestion_jobs(contract_version_id, type)
    WHERE status IN ('QUEUED', 'PROCESSING');

-- ── contract_analysis (append-only) ─────────────────────────────────────
CREATE TABLE contract_analysis (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_version_id   UUID NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
    job_id                UUID NOT NULL REFERENCES ingestion_jobs(id),
    model                 TEXT NOT NULL,
    prompt_version        TEXT NOT NULL,
    embedding_model       TEXT NOT NULL,
    result                JSONB NOT NULL,   -- summary, parties, obligations, paymentTerms,
                                             -- importantDates, termination, governingLaw,
                                             -- riskyClauses[], missingProtections[], evidence[]
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contract_analysis_version_created
    ON contract_analysis(contract_version_id, created_at DESC);

-- ── conversations & messages ─────────────────────────────────────────────
CREATE TABLE conversations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_contract ON conversations(contract_id);

CREATE TYPE message_sender AS ENUM ('user', 'assistant');

CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender            message_sender NOT NULL,
    content           TEXT NOT NULL,
    sources           JSONB,             -- retrieval evidence for assistant turns
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

-- ── prompt_versions ──────────────────────────────────────────────────────
CREATE TABLE prompt_versions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,        -- e.g. 'contract-analysis'
    version            TEXT NOT NULL,        -- e.g. 'v2'
    template          TEXT NOT NULL,
    model             TEXT NOT NULL,
    embedding_model   TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, version)
);

-- ── audit_events ─────────────────────────────────────────────────────────
CREATE TABLE audit_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id),
    action         TEXT NOT NULL,          -- e.g. 'contract.deleted', 'analysis.viewed'
    resource_type  TEXT NOT NULL,
    resource_id    UUID,
    metadata       JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_user_created ON audit_events(user_id, created_at DESC);
