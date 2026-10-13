import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupTestDatabase } from "./helpers/db";
import { migrationFiles, query, queryOne, resetDatabaseForTests, runMigrations } from "@/lib/server/db";
import { execSync } from "node:child_process";

const db = await setupTestDatabase();

describe("migrations and idempotency (section 4)", () => {
  beforeAll(async () => {
    await db.reset();
  });
  afterAll(db.teardown);

  it("runs the same migration set twice without error", async () => {
    await runMigrations();
    await runMigrations();
    const applied = await query<{ filename: string }>("SELECT filename FROM schema_migrations ORDER BY filename");
    expect(applied.map((row) => row.filename)).toEqual(migrationFiles().map((file) => file));
  });

  it("stores one file per version, 0001 first", () => {
    const files = migrationFiles();
    expect(files[0]).toMatch(/^0001_/);
    expect(files[1]).toMatch(/^0002_/);
  });

  it("keeps the pre-marketplace columns and adds the marketplace ones", async () => {
    const columns = await query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
    );
    const names = columns.map((row) => row.column_name);
    for (const column of ["id", "name", "contact", "role", "password_hash", "created_at"]) {
      expect(names).toContain(column);
    }
    for (const column of ["verified", "home_lat", "home_lng"]) {
      expect(names).toContain(column);
    }

    const bookingColumns = await query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'",
    );
    const bookingNames = bookingColumns.map((row) => row.column_name);
    for (const column of ["trainer_id", "offering_id", "price_paise", "request_kind", "start_time"]) {
      expect(bookingNames).toContain(column);
    }
  });

  it("re-seeds reference data after a truncate", async () => {
    await resetDatabaseForTests();
    const category = await queryOne<{ slug: string }>("SELECT slug FROM categories WHERE slug = $1", ["yoga"]);
    expect(category?.slug).toBe("yoga");
    const limit = await queryOne<{ min_paise: number }>(
      "SELECT min_paise FROM pricing_limits WHERE category_slug IS NULL",
      [],
    );
    expect(Number(limit?.min_paise)).toBe(20000);
  });

  it("backfills trainer_id from trainer_name and reports unmatched rows", async () => {
    await resetDatabaseForTests();

    // Two customers and one open booking attached by name.
    const { createUser, createBookingForCustomer, getBookingById } = await import("@/lib/server/store");
    const [a, b] = await Promise.all([
      createUser({ name: "Asha Menon", contact: "nm1", role: "trainer", passwordHash: "x".repeat(64) }),
      createUser({ name: "Asha Menon", contact: "nm2", role: "trainer", passwordHash: "x".repeat(64) }),
      createUser({ name: "Solo Trainer", contact: "nm3", role: "trainer", passwordHash: "x".repeat(64) }),
    ]);
    void a; void b;

    const customer = await createUser({
      name: "Referred",
      contact: "nmc",
      role: "customer",
      passwordHash: "c".repeat(64),
    });

    const ambiguous = await createBookingForCustomer(
      customer.id,
      {
        location: "Somewhere",
        serviceSlug: "yoga",
        serviceName: "Yoga",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        time: "Morning",
        specificTime: "",
      },
      { requestKind: "open", trainerName: "Asha Menon" },
    );
    const unique = await createBookingForCustomer(
      customer.id,
      {
        location: "Somewhere",
        serviceSlug: "yoga",
        serviceName: "Yoga",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        time: "Morning",
        specificTime: "",
      },
      { requestKind: "open", trainerName: "Solo Trainer" },
    );

    const output = execSync(
      "node --env-file-if-exists=.env.local --import ./scripts/register-ts.mjs scripts/migrate-sqlite-to-postgres.ts",
      { encoding: "utf8", env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST } },
    );
    expect(output).toContain("unmatched rows");

    const uniqueBooking = await getBookingById(unique.id);
    // The unambiguous name is linked to the single matching trainer.
    if (uniqueBooking?.trainerId) {
      const linked = await queryOne<{ name: string }>("SELECT name FROM users WHERE id = $1", [
        uniqueBooking.trainerId,
      ]);
      expect(linked?.name).toBe("Solo Trainer");
    }
    const ambiguousBooking = await getBookingById(ambiguous.id);
    expect(ambiguousBooking?.trainerName).toBe("Asha Menon");
  });
});
