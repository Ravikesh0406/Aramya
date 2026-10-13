#!/usr/bin/env node
// Applies pending SQL migrations from migrations/ to DATABASE_URL.
// Usage: npm run db:migrate

import { closePool, runMigrations } from "../src/lib/server/db.ts";

async function main() {
  const started = Date.now();
  await runMigrations();
  console.log(`Migrations up to date (${Date.now() - started}ms).`);
  await closePool();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
