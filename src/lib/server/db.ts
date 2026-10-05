// ARAMYA database provider.
//
// Local dev (default): node:sqlite file at .aramya-data/db.sqlite.
// Prod (serverless-safe): Turso via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
//
// All store code goes through this async interface so the backend can be
// swapped without touching queries. `?` placeholders work on both.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".aramya-data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

export type DbRow = Record<string, unknown>;

export interface DbStatement {
  get(...args: unknown[]): Promise<DbRow | undefined>;
  all(...args: unknown[]): Promise<DbRow[]>;
  run(...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
}

export interface Db {
  prepare(sql: string): DbStatement;
  exec(sql: string): Promise<void>;
  /** True when talking to Turso (DDL differences apply). */
  readonly remote: boolean;
}

// --- Local backend (node:sqlite, synchronous underneath) ---------------------

type SyncStatement = {
  get(...args: unknown[]): unknown;
  all(...args: unknown[]): unknown;
  run(...args: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
};

class LocalStatement implements DbStatement {
  constructor(private stmt: SyncStatement) {}

  async get(...args: unknown[]): Promise<DbRow | undefined> {
    return this.stmt.get(...args) as DbRow | undefined;
  }

  async all(...args: unknown[]): Promise<DbRow[]> {
    return this.stmt.all(...args) as DbRow[];
  }

  async run(...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const res = this.stmt.run(...args);
    return { changes: Number(res.changes), lastInsertRowid: res.lastInsertRowid };
  }
}

class LocalDb implements Db {
  readonly remote = false;
  private db: DatabaseSync;

  constructor() {
    mkdirSync(DATA_DIR, { recursive: true });
    this.db = new DatabaseSync(DB_PATH);
    this.db.exec("PRAGMA journal_mode=WAL");
    this.db.exec("PRAGMA foreign_keys=ON");
  }

  prepare(sql: string): DbStatement {
    return new LocalStatement(
      this.db.prepare(sql) as unknown as SyncStatement,
    );
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}

// --- Turso backend (libsql, always async) ------------------------------------

type LibsqlClient = {
  execute(sql: string | { sql: string; args: unknown[] }): Promise<{
    columns: string[];
    rows: unknown[][];
    rowsAffected: number;
    lastInsertRowid: number | bigint | undefined;
  }>;
  batch(statements: { sql: string; args?: unknown[] }[]): Promise<unknown>;
};

class TursoStatement implements DbStatement {
  constructor(
    private client: LibsqlClient,
    private sql: string,
  ) {}

  private toRows(res: { columns: string[]; rows: unknown[][] }): DbRow[] {
    return res.rows.map((row) => {
      const obj: DbRow = {};
      res.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  async get(...args: unknown[]): Promise<DbRow | undefined> {
    const res = await this.client.execute({ sql: this.sql, args });
    return this.toRows({ columns: res.columns, rows: res.rows })[0];
  }

  async all(...args: unknown[]): Promise<DbRow[]> {
    const res = await this.client.execute({ sql: this.sql, args });
    return this.toRows({ columns: res.columns, rows: res.rows });
  }

  async run(...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const res = await this.client.execute({ sql: this.sql, args });
    return { changes: Number(res.rowsAffected), lastInsertRowid: res.lastInsertRowid ?? 0 };
  }
}

class TursoDb implements Db {
  readonly remote = true;
  private client: LibsqlClient;

  constructor(client: LibsqlClient) {
    this.client = client;
  }

  prepare(sql: string): DbStatement {
    return new TursoStatement(this.client, sql);
  }

  async exec(sql: string): Promise<void> {
    await this.client.execute(sql);
  }
}

// --- Singleton + schema -------------------------------------------------------

let dbInstance: Db | null = null;
let schemaReady: Promise<void> | null = null;

export function usesTurso(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

async function connect(): Promise<Db> {
  if (process.env.TURSO_DATABASE_URL) {
    const mod = (await import("@libsql/client")) as unknown as {
      createClient: (opts: { url: string; authToken?: string }) => LibsqlClient;
    };
    return new TursoDb(
      mod.createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
    );
  }
  return new LocalDb();
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(contact, role)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    service_slug TEXT NOT NULL,
    service_name TEXT NOT NULL,
    days TEXT NOT NULL,
    time TEXT NOT NULL,
    specific_time TEXT NOT NULL,
    status TEXT NOT NULL,
    trainer_name TEXT,
    proposed_days TEXT,
    proposed_time TEXT,
    proposed_specific_time TEXT,
    proposed_by TEXT,
    completed_at TEXT,
    customer_confirmed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT,
    created_at TEXT NOT NULL,
    captured_at TEXT,
    plan TEXT NOT NULL DEFAULT 'trial',
    refund_reference TEXT,
    refunded_at TEXT,
    refund_note TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`,
  `CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    payment_id TEXT UNIQUE NOT NULL,
    booking_id TEXT NOT NULL,
    trainer_name TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    status TEXT NOT NULL,
    reference TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_payouts_trainer ON payouts(trainer_name)`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    trainer_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_trainer ON reviews(trainer_name)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id)`,
];

async function ensureSchema(database: Db): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) {
    await database.exec(sql);
  }
  // Backfill-safe geo columns for DBs created before Phase 2.
  // (Fresh DBs get them inline above; PRAGMA works on both backends.)
  const bookingCols = (await database.prepare("PRAGMA table_info(bookings)").all()) as { name?: unknown }[];
  const bookingNames = new Set(bookingCols.map((c) => String(c.name)));
  if (!bookingNames.has("lat")) await database.exec("ALTER TABLE bookings ADD COLUMN lat REAL");
  if (!bookingNames.has("lng")) await database.exec("ALTER TABLE bookings ADD COLUMN lng REAL");
  if (!bookingNames.has("completed_at")) await database.exec("ALTER TABLE bookings ADD COLUMN completed_at TEXT");
  if (!bookingNames.has("customer_confirmed")) await database.exec("ALTER TABLE bookings ADD COLUMN customer_confirmed INTEGER NOT NULL DEFAULT 0");
  // Phase 4: refund tracking on pre-existing payments tables.
  const paymentCols = (await database.prepare("PRAGMA table_info(payments)").all()) as { name?: unknown }[];
  const paymentNames = new Set(paymentCols.map((c) => String(c.name)));
  if (!paymentNames.has("refund_reference")) await database.exec("ALTER TABLE payments ADD COLUMN refund_reference TEXT");
  if (!paymentNames.has("refunded_at")) await database.exec("ALTER TABLE payments ADD COLUMN refunded_at TEXT");
  if (!paymentNames.has("refund_note")) await database.exec("ALTER TABLE payments ADD COLUMN refund_note TEXT");
  if (!paymentNames.has("plan")) await database.exec("ALTER TABLE payments ADD COLUMN plan TEXT NOT NULL DEFAULT 'trial'");
}

export async function getDb(): Promise<Db> {
  if (!dbInstance) dbInstance = await connect();
  if (!schemaReady) schemaReady = ensureSchema(dbInstance);
  await schemaReady;
  return dbInstance;
}
