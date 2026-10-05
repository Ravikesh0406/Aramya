// One-way copy: local .aramya-data/db.sqlite -> Turso.
// Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:migrate-to-turso
// Idempotent (INSERT OR IGNORE); safe to re-run.
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { createClient } from "@libsql/client";

const LOCAL_PATH = path.join(process.cwd(), ".aramya-data", "db.sqlite");

const TABLES = ["users", "auth_sessions", "bookings", "payments", "payouts"] as const;

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set.");
  const local = new DatabaseSync(LOCAL_PATH);
  const remote = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  for (const table of TABLES) {
    let rows: Record<string, unknown>[];
    try {
      rows = local.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    } catch {
      console.log(`(skip) local table ${table} missing`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`(skip) ${table}: 0 rows`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(", ");
    const toInValue = (v: unknown): string | number | bigint | Uint8Array | null =>
      v == null || typeof v === "string" || typeof v === "number" || typeof v === "bigint" || v instanceof Uint8Array
        ? (v as string | number | bigint | Uint8Array | null)
        : String(v);
    let copied = 0;
    // Small dev-scale datasets: sequential batches of 50.
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50).map((row) => ({
        sql: `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
        args: cols.map((c) => toInValue(row[c])),
      }));
      await remote.batch(batch);
      copied += batch.length;
    }
    console.log(`${table}: ${copied} rows copied`);
  }
  console.log("Done. Point the app at Turso by keeping TURSO_DATABASE_URL set.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
