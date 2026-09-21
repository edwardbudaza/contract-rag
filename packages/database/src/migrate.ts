// Minimal migration runner: applies every .sql file in ./migrations, in filename order,
// that isn't already recorded in schema_migrations. Deliberately simple — no rollback/down
// migrations yet. Each migration runs inside its own transaction so a failure partway
// through a file doesn't leave the schema half-applied.
//
// Exported as a pure function (rather than a script with side effects) so it's callable both
// from bin.ts (the CLI entry, `npm run migrate`) and directly from integration tests
// (tests/integration/database.test.ts) without going through a subprocess.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { getPool } from "./pool";

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  return new Set(result.rows.map((r) => r.name));
}

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

export async function runMigrations(pool: Pool = getPool()): Promise<MigrationResult> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filenames are zero-padded (0001_init.sql, 0002_...sql) so lexical == chronological

  const newlyApplied: string[] = [];
  const alreadyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      alreadyApplied.push(file);
      continue;
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      newlyApplied.push(file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      client.release();
    }
  }

  return { applied: newlyApplied, alreadyApplied };
}
