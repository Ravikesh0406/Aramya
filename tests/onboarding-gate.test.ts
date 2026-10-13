import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupTestDatabase } from "./helpers/db";
import { hashPassword } from "@/lib/server/password";
import { createUser } from "@/lib/server/store";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as acceptRoute } from "@/app/api/bookings/[id]/accept/route";

const db = await setupTestDatabase();

async function reset() {
  await db.reset();
}

const HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

async function signInAsTrainer(): Promise<string> {
  const contact = `trainer${Math.floor(Math.random() * 1e9)}`;
  await createUser({
    name: "Trainer A",
    contact,
    role: "trainer",
    passwordHash: hashPassword("password123"),
  });
  const response = await loginRoute(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ contact, password: "password123", role: "trainer" }),
    }),
  );
  const cookie = response.headers.get("set-cookie") ?? "";
  return cookie.split(";")[0];
}

describe("trainer onboarding gate (D7)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("blocks request handling until the profile is submitted", async () => {
    const cookie = await signInAsTrainer();
    const response = await acceptRoute(
      new Request("http://localhost/api/bookings/some-id/accept", {
        method: "POST",
        headers: { ...HEADERS, cookie },
      }),
      { params: Promise.resolve({ id: "some-id" }) },
    );
    expect(response.status).toBe(403);
    const data = (await response.json()) as { error: string };
    expect(data.error).toMatch(/onboarding/i);
  });
});
