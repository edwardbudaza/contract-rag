// Shared Postgres connection pool. This is the ONLY place `new Pool()` is called —
// apps/api and apps/worker both import `query`/`getPool` from here rather than managing
// their own connections, so pool sizing and shutdown are handled in one place.

import { Pool, type QueryResultRow } from "pg";
import { config } from "@contract-rag/config";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.DATABASE_URL });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Used by GET /ready (apps/api/src/app.ts) — a cheap, side-effect-free connectivity check.
export async function ping(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
