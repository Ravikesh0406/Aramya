import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createUser,
  createSession,
  getUserBySessionToken,
  findUserByContactRole,
} from "@/lib/server/store";
import { getTrainerByUserId } from "@/lib/server/trainers";
import { setupTestDatabase } from "./helpers/db";

const db = await setupTestDatabase();

async function reset() {
  await db.reset();
}

function uniqueContact(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 1_000_000)}`;
}

describe("trainer identity (D7)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("creates a user, a trainer_profiles row, and a unique trainer_code + slug in one transaction", async () => {
    const contact = uniqueContact("90000");
    const user = await createUser({
      name: "Asha Menon",
      contact,
      role: "trainer",
      passwordHash: "x".repeat(64),
    });

    const trainer = await getTrainerByUserId(user.id);
    expect(trainer).not.toBeNull();
    expect(trainer!.trainer_code).toMatch(/^ARM-T-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(trainer!.slug.startsWith("asha-menon-")).toBe(true);
    expect(trainer!.status).toBe("draft");
    expect(trainer!.verification_status).toBe("pending");

    const stored = await findUserByContactRole(contact, "trainer");
    expect(stored?.id).toBe(user.id);
  });

  it("never collides on trainer_code or slug across two signups", async () => {
    const first = await createUser({
      name: "Ravi Kumar",
      contact: uniqueContact("90001"),
      role: "trainer",
      passwordHash: "y".repeat(64),
    });
    const second = await createUser({
      name: "Ravi Kumar",
      contact: uniqueContact("90002"),
      role: "trainer",
      passwordHash: "y".repeat(64),
    });
    const profileA = await getTrainerByUserId(first.id);
    const profileB = await getTrainerByUserId(second.id);
    expect(profileA!.trainer_code).not.toBe(profileB!.trainer_code);
    expect(profileA!.slug).not.toBe(profileB!.slug);
  });

  it("customer signup does not create a trainer profile", async () => {
    const user = await createUser({
      name: "Customer Only",
      contact: uniqueContact("90003"),
      role: "customer",
      passwordHash: "z".repeat(64),
    });
    expect(await getTrainerByUserId(user.id)).toBeNull();
  });

  it("rejects a duplicate contact+role", async () => {
    const contact = uniqueContact("90004");
    await createUser({ name: "Dup Test", contact, role: "customer", passwordHash: "a".repeat(64) });
    await expect(
      createUser({ name: "Dup Again", contact, role: "customer", passwordHash: "a".repeat(64) }),
    ).rejects.toThrow(/already exists/i);
  });

  it("resolves sessions to the signed-in user", async () => {
    const user = await createUser({
      name: "Session Test",
      contact: uniqueContact("90005"),
      role: "trainer",
      passwordHash: "b".repeat(64),
    });
    const session = await createSession(user.id);
    const resolved = await getUserBySessionToken(session.token);
    expect(resolved?.id).toBe(user.id);
    expect(await getUserBySessionToken("nope")).toBeNull();
  });
});
