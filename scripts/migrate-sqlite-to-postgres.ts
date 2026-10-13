#!/usr/bin/env node
// One-time import: existing SQLite/Turso data -> PostgreSQL.
//
// Idempotent (ON CONFLICT DO NOTHING) and verifies row counts afterwards.
// Usage: npm run db:import
//
// Trainer rows also get a backfilled trainer_profiles row (draft profile, unique
// trainer_code + slug) so legacy trainers reach onboarding on next login.

import { DatabaseSync } from "node:sqlite";
import { closePool, ensureSchema, execute, query, queryOne, transaction } from "../src/lib/server/db.ts";
import { createTrainerProfileForUser } from "../src/lib/server/trainers.ts";
import path from "node:path";

const SQLITE_PATH = path.join(process.cwd(), ".aramya-data", "db.sqlite");

const TABLES = [
  { name: "users", orderBy: "created_at" },
  { name: "auth_sessions", orderBy: "created_at" },
  { name: "bookings", orderBy: "created_at" },
];

function sqliteColumns(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((row) => row.name);
}

async function postgresColumns(table: string): Promise<Set<string>> {
  const rows = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table],
  );
  return new Set(rows.map((row) => row.column_name));
}

function toParam(value: unknown, column: string): unknown {
  if (value === null || value === undefined) return null;
  // SQLite stored booleans as integers.
  if (column === "verified" && typeof value === "number") return value === 1;
  return value;
}

async function importTable(db: DatabaseSync, table: string, orderBy: string) {
  const columns = sqliteColumns(db, table);
  if (columns.length === 0) {
    console.log(`  ${table}: not present in SQLite, skipped.`);
    return { imported: 0, source: 0 };
  }
  const target = await postgresColumns(table);
  const usable = columns.filter((column) => target.has(column));
  const rows = db.prepare(`SELECT ${usable.join(", ")} FROM ${table} ORDER BY ${orderBy}`).all() as Record<
    string,
    unknown
  >[];

  let imported = 0;
  const columnList = usable.join(", ");
  const placeholders = usable.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  for (const row of rows) {
    const result = await execute(
      sql,
      usable.map((column) => toParam(row[column], column)) as (string | number | boolean | null)[],
    );
    imported += result.changes;
  }
  return { imported, source: rows.length };
}

async function backfillTrainerProfiles() {
  const trainers = await query<{ id: string; name: string; verified: boolean }>(
    `SELECT id, name, verified FROM users WHERE role = 'trainer' ORDER BY created_at`,
  );
  let created = 0;
  for (const trainer of trainers) {
    const existing = await queryOne<{ user_id: string }>(
      "SELECT user_id FROM trainer_profiles WHERE user_id = $1",
      [trainer.id],
    );
    if (existing) continue;
    await transaction(async (client) => {
      await createTrainerProfileForUser(trainer.id, trainer.name, client);
      await client.query(
        `UPDATE trainer_profiles SET status = 'submitted', verification_status = $1
          WHERE user_id = $2`,
        [trainer.verified ? "verified" : "pending", trainer.id],
      );
    });
    created += 1;
  }
  return { created, total: trainers.length };
}

/** Re-keys legacy bookings.trainer_name -> bookings.trainer_id where unambiguous. */
async function backfillBookingTrainerIds() {
  const rows = await query<{ id: string; trainer_name: string | null; trainer_id: string | null }>(
    "SELECT id, trainer_name, trainer_id FROM bookings WHERE trainer_name IS NOT NULL",
  );
  const trainers = await query<{ id: string; name: string }>(
    "SELECT id, name FROM users WHERE role = 'trainer'",
  );
  const byName = new Map<string, string[]>();
  for (const trainer of trainers) {
    const list = byName.get(trainer.name) ?? [];
    list.push(trainer.id);
    byName.set(trainer.name, list);
  }

  let matched = 0;
  const unmatched: string[] = [];
  for (const row of rows) {
    if (row.trainer_id) continue;
    const name = row.trainer_name ?? "";
    const candidates = byName.get(name) ?? [];
    if (candidates.length === 1) {
      await execute("UPDATE bookings SET trainer_id = $1 WHERE id = $2", [candidates[0], row.id]);
      matched += 1;
    } else {
      unmatched.push(`${row.id} · trainer_name="${name}" · ${candidates.length} matches`);
    }
  }
  return { matched, unmatched };
}

async function verifyCounts(db: DatabaseSync) {
  const report: { table: string; sqlite: number; postgres: number }[] = [];
  for (const { name } of TABLES) {
    let sqlite = 0;
    try {
      sqlite = (db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get() as { count: number }).count;
    } catch {
      sqlite = 0;
    }
    const row = await queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM ${name}`);
    report.push({ table: name, sqlite, postgres: row?.count ?? 0 });
  }
  return report;
}

async function main() {
  await ensureSchema();
  const db = new DatabaseSync(SQLITE_PATH);
  console.log(`Importing from ${SQLITE_PATH}`);

  for (const { name, orderBy } of TABLES) {
    const result = await importTable(db, name, orderBy);
    console.log(`  ${name}: ${result.imported} new rows (source had ${result.source}).`);
  }

  const profiles = await backfillTrainerProfiles();
  console.log(`  trainer_profiles: ${profiles.created} backfilled of ${profiles.total} trainer accounts.`);

  const rekeyed = await backfillBookingTrainerIds();
  console.log(`  bookings.trainer_id: ${rekeyed.matched} matched by name.`);
  if (rekeyed.unmatched.length > 0) {
    console.log(`  unmatched rows (kept NULL, kept trainer_name):`);
    for (const line of rekeyed.unmatched) console.log(`    - ${line}`);
  }

  const verified = await verifyCounts(db);
  console.log("Row-count verification:");
  let ok = true;
  for (const row of verified) {
    const status = row.postgres >= row.sqlite ? "ok" : "MISMATCH";
    if (row.postgres < row.sqlite) ok = false;
    console.log(`  ${row.table}: sqlite=${row.sqlite} postgres=${row.postgres} [${status}]`);
  }

  db.close();
  await closePool();
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
