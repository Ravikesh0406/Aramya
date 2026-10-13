// ARAMYA — PostgreSQL data layer.
//
// One `pg` Pool per process. The module keeps a small synchronous-looking adapter
// (`prepare().get/all/run`, `exec`) so call sites read like the old SQLite store,
// plus a real `transaction(fn)` helper for atomic writes.
//
// App-level types stay stable: timestamptz columns are returned as ISO strings,
// money stays integer paise.

import { Pool, type PoolClient, type QueryResult } from "pg";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import crypto from "crypto";

export type Row = Record<string, unknown>;
export type Param = string | number | boolean | null | undefined;

const SSL_MODES = new Set(["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]);

function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See docs/ENVIRONMENT.md for local Postgres setup.");
  }
  return url;
}

function sslConfig(): { rejectUnauthorized: boolean } | undefined {
  // Local docker Postgres has no certificates; managed hosts need it.
  const mode = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (!SSL_MODES.has(mode)) return undefined;
  if (mode === "disable") return undefined;
  return { rejectUnauthorized: mode === "verify-ca" || mode === "verify-full" };
}

function createPool(): Pool {
  return new Pool({
    connectionString: resolveConnectionString(),
    // Small pool: route handlers are short-lived queries.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: sslConfig(),
  });
}

// Share one Pool across hot reloads in dev.
const globalForPool = globalThis as unknown as { __aramyaPool?: Pool; __aramyaMigrating?: Promise<void> };

export function getPool(): Pool {
  globalForPool.__aramyaPool ??= createPool();
  return globalForPool.__aramyaPool;
}

/** Normalises a pg row: Date -> ISO string, bigint -> number, undefined -> null. */
export function normalizeRow<T extends Row>(row: QueryResult["rows"][number]): T {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) out[key] = null;
    else if (value instanceof Date) out[key] = value.toISOString();
    else if (typeof value === "bigint") out[key] = Number(value);
    else out[key] = value;
  }
  return out as T;
}

export type RunResult = { changes: number };

/** Sync-looking statement wrapper. */
export class Statement {
  readonly sql: string;
  readonly client: PoolClient | undefined;

  constructor(sql: string, client?: PoolClient) {
    this.sql = sql;
    this.client = client;
  }

  private async exec(params: Param[]): Promise<{ rows: Row[]; rowCount: number }> {
    const runner = this.client ?? getPool();
    const result = await runner.query(this.sql, params as unknown[]);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }

  async get<T extends Row>(...params: Param[]): Promise<T | null> {
    const { rows } = await this.exec(params);
    return rows.length ? normalizeRow<T>(rows[0]) : null;
  }

  async all<T extends Row>(...params: Param[]): Promise<T[]> {
    const { rows } = await this.exec(params);
    return rows.map((row) => normalizeRow<T>(row));
  }

  async run(...params: Param[]): Promise<RunResult> {
    const { rowCount } = await this.exec(params);
    return { changes: rowCount };
  }
}

/** Returns a prepared statement bound to the pool or a transaction client. */
export function prepare(sql: string, client?: PoolClient): Statement {
  return new Statement(sql, client);
}

export async function query<T extends Row>(sql: string, params: Param[] = []): Promise<T[]> {
  return prepare(sql).all<T>(...params);
}

export async function queryOne<T extends Row>(sql: string, params: Param[] = []): Promise<T | null> {
  return prepare(sql).get<T>(...params);
}

export async function execute(sql: string, params: Param[] = []): Promise<RunResult> {
  return prepare(sql).run(...params);
}

/** Runs fn inside a transaction; rolls back on error. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection already lost */
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function exec(sql: string): Promise<void> {
  await getPool().query(sql);
}

export function randomId(): string {
  const webcrypto = crypto as Crypto & { randomUUID: () => string };
  return typeof webcrypto.randomUUID === "function"
    ? webcrypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Converts `?` placeholders to `$1..$n` for SQL converted from the SQLite store. */
export function toPositional(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/* ------------------------------------------------------------------ migrations */

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

/** Applies pending migrations idempotently. Safe to call from several callers. */
export function runMigrations(): Promise<void> {
  globalForPool.__aramyaMigrating ??= (async () => {
    const pool = getPool();
    let appliedAny = false;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    const applied = new Set(
      (await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations")).rows.map(
        (row) => row.filename,
      ),
    );
    for (const file of migrationFiles()) {
      if (applied.has(file)) continue;
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : error}`);
      } finally {
        client.release();
      }
      appliedAny = true;
    }
    // Reference data (categories, pricing limits) is seeded idempotently so a
    // truncated or freshly-created database always has the same baseline.
    const { seedReferenceData } = await import("@/lib/server/seed");
    await seedReferenceData();
    void appliedAny;
  })();
  return globalForPool.__aramyaMigrating;
}

/** Ensures the schema is present before the first query runs. */
export async function ensureSchema(): Promise<void> {
  await runMigrations();
}

export async function closePool(): Promise<void> {
  const pool = globalForPool.__aramyaPool;
  if (pool) {
    await pool.end();
    globalForPool.__aramyaPool = undefined;
    globalForPool.__aramyaMigrating = undefined;
  }
}

/**
 * Test helper: truncate every application table, then re-seed reference data.
 * Never call outside tests.
 */
export async function resetDatabaseForTests(): Promise<void> {
  await exec(`
    TRUNCATE TABLE
      reviews, profile_reports, area_interest, subscription_payments, trainer_subscriptions,
      subscription_plans, pricing_limits, trainer_certifications, trainer_availability,
      trainer_service_areas, trainer_offerings, trainer_categories, categories,
      trainer_profiles, bookings, auth_sessions, users
    RESTART IDENTITY CASCADE;
  `);
  const { seedReferenceData } = await import("@/lib/server/seed");
  await seedReferenceData();
}
