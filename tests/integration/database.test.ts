// Runs against a REAL Postgres — this is not mocked. Locally: docker compose up -d postgres
// (or any Postgres reachable at DATABASE_URL), then `npm run test:integration`. In CI, the
// postgres service container in .github/workflows/ci.yml plays the same role.
//
// This is deliberately the one place Phase 1 proves the schema and migration runner work
// against a live database, not just that the SQL file parses.

import { runMigrations, ping, query, closePool } from "@contract-rag/database";

beforeAll(async () => {
  await runMigrations();
});

afterAll(async () => {
  await closePool();
});

afterEach(async () => {
  // Keep the suite idempotent across repeated local runs — cascades clean up every
  // dependent row (contract_versions, ingestion_jobs, contract_analysis, etc).
  await query("TRUNCATE TABLE users CASCADE");
});

describe("database connectivity", () => {
  it("ping() succeeds against a reachable database", async () => {
    await expect(ping()).resolves.toBe(true);
  });
});

describe("migrations", () => {
  it("running migrations a second time is a no-op", async () => {
    const result = await runMigrations();
    expect(result.applied).toEqual([]);
    expect(result.alreadyApplied.length).toBeGreaterThan(0);
  });
});

describe("schema — users → contracts → contract_versions", () => {
  it("supports the core insert/read path with foreign keys intact", async () => {
    const { rows: userRows } = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      ["test@example.com", "not-a-real-hash"],
    );
    const userId = userRows[0]!.id;

    const { rows: contractRows } = await query<{ id: string; status: string }>(
      "INSERT INTO contracts (owner_id, title) VALUES ($1, $2) RETURNING id, status",
      [userId, "Master Services Agreement"],
    );
    expect(contractRows[0]!.status).toBe("UPLOADING"); // schema default

    const contractId = contractRows[0]!.id;
    const { rows: versionRows } = await query<{ id: string }>(
      `INSERT INTO contract_versions
         (contract_id, file_name, file_type, file_size, storage_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [contractId, "msa-v1.pdf", "application/pdf", 12345, "contracts/msa-v1.pdf"],
    );
    expect(versionRows[0]!.id).toBeDefined();

    const { rows: joined } = await query<{ title: string; file_name: string }>(
      `SELECT c.title, cv.file_name
         FROM contracts c
         JOIN contract_versions cv ON cv.contract_id = c.id
        WHERE c.id = $1`,
      [contractId],
    );
    expect(joined[0]).toEqual({ title: "Master Services Agreement", file_name: "msa-v1.pdf" });
  });

  it("cascades contract deletion down to its versions", async () => {
    const { rows: userRows } = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      ["cascade@example.com", "hash"],
    );
    const { rows: contractRows } = await query<{ id: string }>(
      "INSERT INTO contracts (owner_id, title) VALUES ($1, $2) RETURNING id",
      [userRows[0]!.id, "NDA"],
    );
    const contractId = contractRows[0]!.id;
    await query(
      `INSERT INTO contract_versions (contract_id, file_name, file_type, file_size, storage_key)
       VALUES ($1, 'nda.pdf', 'application/pdf', 10, 'nda.pdf')`,
      [contractId],
    );

    await query("DELETE FROM contracts WHERE id = $1", [contractId]);

    const { rows } = await query("SELECT * FROM contract_versions WHERE contract_id = $1", [
      contractId,
    ]);
    expect(rows).toHaveLength(0);
  });
});

describe("idempotency guard — uq_ingestion_jobs_inflight", () => {
  it("rejects a second in-flight job of the same type for the same version", async () => {
    const { rows: userRows } = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      ["jobs@example.com", "hash"],
    );
    const { rows: contractRows } = await query<{ id: string }>(
      "INSERT INTO contracts (owner_id, title) VALUES ($1, $2) RETURNING id",
      [userRows[0]!.id, "Contract with jobs"],
    );
    const { rows: versionRows } = await query<{ id: string }>(
      `INSERT INTO contract_versions (contract_id, file_name, file_type, file_size, storage_key)
       VALUES ($1, 'c.pdf', 'application/pdf', 1, 'c.pdf') RETURNING id`,
      [contractRows[0]!.id],
    );
    const versionId = versionRows[0]!.id;

    // First EXTRACTION job for this version: fine.
    await query(
      "INSERT INTO ingestion_jobs (contract_version_id, type, status) VALUES ($1, 'EXTRACTION', 'QUEUED')",
      [versionId],
    );

    // A second, concurrent EXTRACTION job for the SAME version: this is exactly the
    // duplicate-retry scenario the worker idempotency rules (architecture.md §8) guard
    // against — the partial unique index in migrations/0001_init.sql must reject it.
    await expect(
      query(
        "INSERT INTO ingestion_jobs (contract_version_id, type, status) VALUES ($1, 'EXTRACTION', 'QUEUED')",
        [versionId],
      ),
    ).rejects.toThrow(/duplicate key value violates unique constraint/);

    // A COMPLETED job of the same type is fine — the guard only covers in-flight statuses.
    await query(
      "UPDATE ingestion_jobs SET status = 'COMPLETED' WHERE contract_version_id = $1",
      [versionId],
    );
    await expect(
      query(
        "INSERT INTO ingestion_jobs (contract_version_id, type, status) VALUES ($1, 'EXTRACTION', 'QUEUED')",
        [versionId],
      ),
    ).resolves.toBeDefined();
  });
});
