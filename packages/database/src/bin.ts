// CLI entry: `npm run migrate --workspace=packages/database` (or the root `npm run db:migrate`
// alias). Thin wrapper around runMigrations() — all the actual logic lives in migrate.ts so
// it stays testable without spawning a subprocess.

import { runMigrations } from "./migrate";
import { closePool } from "./pool";

async function main() {
  const result = await runMigrations();
  // eslint-disable-next-line no-console
  console.log(`Applied ${result.applied.length} migration(s):`, result.applied);
  // eslint-disable-next-line no-console
  console.log(`${result.alreadyApplied.length} already up to date.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
