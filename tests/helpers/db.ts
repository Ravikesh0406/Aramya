// Tests that touch the database use a SEPARATE Postgres database.
// The suite refuses to run if DATABASE_URL_TEST is missing or points at the
// dev/production database.

import { resetDatabaseForTests, runMigrations, closePool, getPool } from "@/lib/server/db";

const DEV_HOSTS = ["aramya_dev", "aramya_prod", "aramya"];

export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST is not set. Tests must run against a separate Postgres database (see docs/ENVIRONMENT.md).",
    );
  }
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (!name || !name.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against "${name || url}": DATABASE_URL_TEST must point at a *_test database.`,
    );
  }
  if (DEV_HOSTS.includes(name)) {
    throw new Error(`Refusing to run tests against the development database "${name}".`);
  }
  return url;
}

/** Applies migrations to the test database and returns reset/teardown helpers. */
export async function setupTestDatabase(): Promise<{ reset: () => Promise<void>; teardown: () => Promise<void> }> {
  // The data layer reads DATABASE_URL; point it at the test database before the
  // pool is created, and keep the original value untouched.
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDatabaseUrl();
  try {
    await runMigrations();
    const pool = getPool();
    await pool.query("SELECT 1");
  } finally {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  }
  return {
    reset: async () => {
      process.env.DATABASE_URL = testDatabaseUrl();
      await resetDatabaseForTests();
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    },
    teardown: async () => {
      await closePool();
    },
  };
}
