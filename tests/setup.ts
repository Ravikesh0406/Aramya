// Vitest setup: refuse to run unless a separate test database is configured.

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error("DATABASE_URL_TEST is not set - tests must use a separate Postgres database.");
}
try {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`DATABASE_URL_TEST must point at a *_test database (got "${name}").`);
  }
} catch (error) {
  if (error instanceof Error && error.message.startsWith("DATABASE_URL_TEST")) throw error;
  throw new Error("DATABASE_URL_TEST is not a valid URL.");
}

// The data layer reads DATABASE_URL; alias the test URL for the whole run.
process.env.DATABASE_URL = url;
