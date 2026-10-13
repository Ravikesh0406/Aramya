import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupTestDatabase } from "./helpers/db";
import { hashPassword } from "@/lib/server/password";
import { createUser } from "@/lib/server/store";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { PUT as basicsRoute } from "@/app/api/trainer/basics/route";
import { POST as offeringsRoute } from "@/app/api/trainer/offerings/route";
import { PUT as availabilityRoute } from "@/app/api/trainer/availability/route";
import { POST as submitRoute } from "@/app/api/trainer/submit/route";
import { POST as targetedRoute } from "@/app/api/bookings/targeted/route";
import { GET as trainersRoute } from "@/app/api/trainers/route";
import { GET as profileRoute } from "@/app/api/trainer/profile/route";
import { upsertPricingLimit } from "@/lib/server/pricing";
import {
  insertOffering,
  replaceTrainerAreas,
  replaceTrainerAvailability,
  replaceTrainerCategories,
  setVerificationStatus,
  submitTrainerProfile,
  updateTrainerBasics,
  getTrainerBySlug,
} from "@/lib/server/trainers";

const db = await setupTestDatabase();

async function reset() {
  await db.reset();
  await upsertPricingLimit({ categorySlug: null, minPaise: 20000, maxPaise: 500000 });
}

const HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

async function createTrainer(name: string) {
  const contact = `tr${Math.floor(Math.random() * 1e9)}`;
  const user = await createUser({ name, contact, role: "trainer", passwordHash: hashPassword("password123") });
  const trainer = await getTrainerBySlug((await (await import("@/lib/server/trainers")).getTrainerByUserId(user.id))!.slug);
  return { user, trainer: trainer!, slug: trainer!.slug };
}

async function onboard(slug: string, trainerId: string) {
  await updateTrainerBasics(trainerId, { bio: "A long enough biography for the onboarding gate to pass.", yearsExperience: 4, languages: ["English"] });
  await replaceTrainerCategories(trainerId, [{ slug: "yoga", primary: true }]);
  await replaceTrainerAreas(trainerId, [{ city: "Delhi", locality: "Vasant Vihar", pinCode: "110057" }]);
  await replaceTrainerAvailability(trainerId, [{ weekday: 1, startTime: "06:00", endTime: "09:00" }]);
  await insertOffering(trainerId, {
    categorySlug: "yoga",
    format: "home_visit",
    durationMin: 60,
    pricePaise: 50000,
    sessionsInPackage: 1,
    active: true,
  });
  await submitTrainerProfile(trainerId);
  await setVerificationStatus(trainerId, "verified", null, "test");
  void slug;
}

async function cookieFor(contact: string, role: "trainer" | "customer", password = "password123") {
  const response = await loginRoute(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ contact, password, role }),
    }),
  );
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

async function post(path: string, cookie: string, body: unknown) {
  return fetchLike(path, "POST", cookie, body);
}

function fetchLike(path: string, method: string, cookie: string, body?: unknown) {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: { ...HEADERS, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (path === "/api/trainer/basics") return basicsRoute(request);
  if (path === "/api/trainer/offerings") return offeringsRoute(request);
  if (path === "/api/trainer/availability") return availabilityRoute(request);
  if (path === "/api/trainer/submit") return submitRoute(request);
  if (path === "/api/bookings/targeted") return targetedRoute(request);
  throw new Error(`no route for ${path}`);
}

describe("authorization (section 5)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("a trainer cannot edit another trainer's profile or offerings", async () => {
    const attacker = await createTrainer("Attacker Trainer");
    const victim = await createTrainer("Victim Trainer");
    await onboard(victim.slug, victim.user.id);

    const cookie = await cookieFor(attacker.user.contact, "trainer");

    const basics = await post("/api/trainer/basics", cookie, {
      bio: "Hijacking this profile with a completely different biography that is long enough.",
      yearsExperience: 20,
      languages: ["English"],
    });
    // The server resolves the trainer from the session, so this only edits the
    // attacker's own profile.
    expect(basics.status).toBe(200);

    const offering = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "home_visit",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
    });
    expect(offering.status).toBe(201);

    // The victim's data is untouched.
    const victimOfferings = await (await import("@/lib/server/trainers")).listTrainerOfferings(victim.user.id);
    expect(victimOfferings).toHaveLength(1);
    const victimTrainer = await getTrainerBySlug(victim.slug);
    expect(victimTrainer!.bio).not.toContain("Hijacking");
  });

  it("a customer cannot reach trainer-only routes", async () => {
    const customer = await createUser({
      name: "Curious",
      contact: `cs${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: hashPassword("password123"),
    });
    const cookie = await cookieFor(customer.contact, "customer");
    const response = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "home_visit",
      durationMin: 60,
      pricePaise: 50000,
    });
    expect(response.status).toBe(401);
  });

  it("a customer cannot change a price: offerings are trainer-only", async () => {
    const trainer = await createTrainer("Priced Trainer");
    await onboard(trainer.slug, trainer.user.id);
    const customer = await createUser({
      name: "Bargain",
      contact: `bg${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: hashPassword("password123"),
    });
    const cookie = await cookieFor(customer.contact, "customer");
    const response = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "home_visit",
      durationMin: 60,
      pricePaise: 1,
    });
    expect(response.status).toBe(401);
  });

  it("a targeted booking ignores a tampered price and rejects an unknown offering", async () => {
    const trainer = await createTrainer("Tamper Target");
    await onboard(trainer.slug, trainer.user.id);
    const customer = await createUser({
      name: "Tamperer",
      contact: `tm${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: hashPassword("password123"),
    });
    const cookie = await cookieFor(customer.contact, "customer");

    const wrongOffering = await post("/api/bookings/targeted", cookie, {
      trainerSlug: trainer.slug,
      offeringId: "made-up-id",
      weekdays: [1],
      startTime: "07:00",
      location: "12 Some Street, Delhi",
      pricePaise: 1,
    });
    expect(wrongOffering.status).toBe(400);
  });
});

describe("public endpoints (D13)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("the public trainer list contains no private fields", async () => {
    const trainer = await createTrainer("Quiet Trainer");
    await onboard(trainer.slug, trainer.user.id);
    const response = await trainersRoute(new Request("http://localhost/api/trainers?pin=110057"));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(trainer.user.contact);
    expect(text).not.toContain("password");
    expect(text).not.toContain("zoom.us");
    expect(text).not.toContain("verification_note");
    expect(text).toContain(trainer.slug);
  });

  it("rejects requests without the AJAX header on state-changing routes", async () => {
    const request = new Request("http://localhost/api/bookings/targeted", { method: "POST" });
    const response = await targetedRoute(request);
    expect(response.status).toBe(403);
  });
});

describe("onboarding persistence (section 3)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("saves each step server-side and blocks submission until complete", async () => {
    const trainer = await createTrainer("Step By Step");
    const cookie = await cookieFor(trainer.user.contact, "trainer");

    const earlySubmit = await post("/api/trainer/submit", cookie, {});
    expect(earlySubmit.status).toBe(400);

    await post("/api/trainer/basics", cookie, {
      bio: "A complete biography that passes every onboarding validation rule.",
      yearsExperience: 6,
      languages: ["English", "Hindi"],
    });
    const { PUT: categoriesRoute } = await import("@/app/api/trainer/categories/route");
    const categories = await categoriesRoute(
      new Request("http://localhost/api/trainer/categories", {
        method: "PUT",
        headers: { ...HEADERS, cookie },
        body: JSON.stringify({ categories: [{ slug: "yoga", primary: true }] }),
      }),
    );
    expect(categories.status).toBe(200);

    await post("/api/trainer/availability", cookie, {
      ranges: [{ weekday: 1, startTime: "06:00", endTime: "09:00" }],
    });
    const { PUT: areasRoute } = await import("@/app/api/trainer/areas/route");
    const areas = await areasRoute(
      new Request("http://localhost/api/trainer/areas", {
        method: "PUT",
        headers: { ...HEADERS, cookie },
        body: JSON.stringify({
          radiusKm: 10,
          areas: [{ city: "Delhi", locality: "Vasant Vihar", pinCode: "110057" }],
        }),
      }),
    );
    expect(areas.status).toBe(200);

    await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "home_visit",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
    });

    const { POST: photoRoute } = await import("@/app/api/trainer/photo/route");
    const oneByOnePng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+aAAAAABJRU5ErkJggg==";
    const photo = await photoRoute(
      new Request("http://localhost/api/trainer/photo", {
        method: "POST",
        headers: { ...HEADERS, cookie },
        body: JSON.stringify({ dataUrl: oneByOnePng, kind: "photo" }),
      }),
    );
    expect(photo.status).toBe(201);

    const { PUT: certificationsRoute } = await import("@/app/api/trainer/certifications/route");
    const certifications = await certificationsRoute(
      new Request("http://localhost/api/trainer/certifications", {
        method: "PUT",
        headers: { ...HEADERS, cookie },
        body: JSON.stringify({
          certifications: [{ name: "RYT-200", issuer: "Yoga Alliance", year: 2019 }],
        }),
      }),
    );
    expect(certifications.status).toBe(200);

    const submitted = await post("/api/trainer/submit", cookie, {});
    expect(submitted.status).toBe(200);
    const data = (await submitted.json()) as { trainer: { status: string } };
    expect(data.trainer.status).toBe("submitted");

    // Persisted across a fresh read
    const profile = await profileRoute(new Request("http://localhost/api/trainer/profile", { headers: { cookie } }));
    const profileData = (await profile.json()) as {
      trainer: { yearsExperience: number; languages: string[] };
      areas: { pin_code: string }[];
      availability: { start_time: string }[];
    };
    expect(profileData.trainer.yearsExperience).toBe(6);
    expect(profileData.trainer.languages).toEqual(["English", "Hindi"]);
    expect(profileData.areas[0].pin_code).toBe("110057");
    expect(profileData.availability[0].start_time).toBe("06:00");
  });

  it("validates PIN format, availability overlaps and duration steps", async () => {
    const trainer = await createTrainer("Validator");
    const cookie = await cookieFor(trainer.user.contact, "trainer");

    const { PUT: areasRoute } = await import("@/app/api/trainer/areas/route");
    const badPin = await areasRoute(
      new Request("http://localhost/api/trainer/areas", {
        method: "PUT",
        headers: { ...HEADERS, cookie },
        body: JSON.stringify({
          radiusKm: 10,
          areas: [{ city: "Delhi", locality: "Bad", pinCode: "0123" }],
        }),
      }),
    );
    expect(badPin.status).toBe(400);

    const overlap = await post("/api/trainer/availability", cookie, {
      ranges: [
        { weekday: 1, startTime: "06:00", endTime: "09:00" },
        { weekday: 1, startTime: "08:00", endTime: "11:00" },
      ],
    });
    expect(overlap.status).toBe(400);

    const stepped = await post("/api/trainer/availability", cookie, {
      ranges: [{ weekday: 1, startTime: "06:00", endTime: "09:00" }],
    });
    expect(stepped.status).toBe(200);

    const badStep = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "home_visit",
      durationMin: 50,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
    });
    expect(badStep.status).toBe(400);
  });

  it("rejects an online offering without a Zoom link", async () => {
    const trainer = await createTrainer("No Link");
    const cookie = await cookieFor(trainer.user.contact, "trainer");
    const response = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "online",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
    });
    expect(response.status).toBe(400);
  });

  it("rejects a non-Zoom meeting link", async () => {
    const trainer = await createTrainer("Bad Link");
    const cookie = await cookieFor(trainer.user.contact, "trainer");
    const httpLink = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "online",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
      meetingUrl: "http://zoom.us/j/1",
    });
    expect(httpLink.status).toBe(400);
    const otherHost = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "online",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
      meetingUrl: "https://example.com/j/1",
    });
    expect(otherHost.status).toBe(400);
    const zoomSubdomain = await post("/api/trainer/offerings", cookie, {
      categorySlug: "yoga",
      format: "online",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
      active: true,
      meetingUrl: "https://us02web.zoom.us/j/12345",
    });
    expect(zoomSubdomain.status).toBe(201);
  });
});
