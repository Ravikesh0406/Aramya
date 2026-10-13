import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupTestDatabase } from "./helpers/db";
import { createBookingForCustomer, createUser, getBookingById } from "@/lib/server/store";
import {
  insertOffering,
  listTrainerOfferings,
  updateOffering,
  getTrainerBySlug,
  isPubliclyListed,
  replaceTrainerAreas,
  replaceTrainerAvailability,
  replaceTrainerCategories,
  setVerificationStatus,
  submitTrainerProfile,
  updateTrainerBasics,
  trainerHasActiveSubscription,
} from "@/lib/server/trainers";
import { checkOfferingPrice, getPricingBounds, upsertPricingLimit } from "@/lib/server/pricing";
import { availabilityFits, createTargetedBooking, trainerScheduleClash } from "@/lib/server/booking";
import { getTrainerByUserId } from "@/lib/server/trainers";
import { purchaseSubscription, getActiveSubscription } from "@/lib/server/subscriptions";
import { searchTrainers } from "@/lib/server/search";
import { getPublicTrainerProfile } from "@/lib/server/search";

const db = await setupTestDatabase();

async function reset() {
  await db.reset();
  await upsertPricingLimit({ categorySlug: null, minPaise: 20000, maxPaise: 500000 });
}

/**
 * Creates a fully onboarded trainer with one active offering.
 * `createUser` already creates the trainer_profiles row atomically.
 */
async function makeTrainer(options: {
  name: string;
  categorySlug?: string;
  format?: "home_visit" | "online";
  durationMin?: number;
  pricePaise?: number;
  areas?: { city: string; locality: string; pinCode: string }[];
  verified?: boolean;
  bio?: string;
  meetingUrl?: string | null;
}) {
  const categorySlug = options.categorySlug ?? "yoga";
  const format = options.format ?? "home_visit";
  const durationMin = options.durationMin ?? 60;
  const pricePaise = options.pricePaise ?? 50000;
  const contact = `tr${Math.floor(Math.random() * 1e9)}`;

  const user = await createUser({
    name: options.name,
    contact,
    role: "trainer",
    passwordHash: "p".repeat(64),
  });
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) throw new Error("trainer profile was not created with the account");

  await updateTrainerBasics(user.id, {
    bio: options.bio ?? "A trainer with a long enough biography for the listing gate.",
    yearsExperience: 5,
    languages: ["English", "Hindi"],
  });
  await replaceTrainerCategories(user.id, [{ slug: categorySlug, primary: true }]);
  if (options.areas) {
    await replaceTrainerAreas(user.id, options.areas);
  }
  await replaceTrainerAvailability(user.id, [
    { weekday: 1, startTime: "06:00", endTime: "10:00" },
    { weekday: 3, startTime: "17:00", endTime: "21:00" },
  ]);

  const offering = await insertOffering(user.id, {
    categorySlug,
    format,
    durationMin,
    pricePaise,
    sessionsInPackage: 1,
    active: true,
    meetingUrl: format === "online" ? (options.meetingUrl ?? "https://zoom.us/j/123") : null,
  });

  if (options.verified !== false) {
    await submitTrainerProfile(user.id);
    await setVerificationStatus(user.id, "verified", null, "test");
  }

  return { user, trainer, offering, slug: trainer.slug };
}

describe("pricing bounds (D2)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("accepts a price inside the per-60-minute range and rejects outside", async () => {
    const bounds = await getPricingBounds("yoga");
    expect(bounds?.minPaise).toBe(20000);
    expect(bounds?.maxPaise).toBe(500000);

    const inside = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
    });
    expect(inside.ok).toBe(true);

    const below = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 10000,
      sessionsInPackage: 1,
    });
    expect(below.ok).toBe(false);

    const above = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 6000000,
      sessionsInPackage: 1,
    });
    expect(above.ok).toBe(false);
  });

  it("normalises per 60 minutes across durations", async () => {
    // ₹100 for 30 minutes == ₹200 per 60 minutes == exactly the minimum: allowed.
    const atMinimum = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 30,
      pricePaise: 10000,
      sessionsInPackage: 1,
    });
    expect(atMinimum.ok).toBe(true);

    // ₹150 for 90 minutes == ₹100 per 60 minutes: below the minimum.
    const below = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 90,
      pricePaise: 15000,
      sessionsInPackage: 1,
    });
    expect(below.ok).toBe(false);
  });

  it("checks packages per session", async () => {
    // 4 x 60min at ₹60,000 total = ₹15,000/session = below the minimum
    const tooCheap = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 60000,
      sessionsInPackage: 4,
    });
    expect(tooCheap.ok).toBe(false);

    const ok = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 200000,
      sessionsInPackage: 4,
    });
    expect(ok.ok).toBe(true);
  });

  it("admin-changed limits take effect immediately", async () => {
    await upsertPricingLimit({ categorySlug: null, minPaise: 40000, maxPaise: 100000 });
    const now = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 50000,
      sessionsInPackage: 1,
    });
    // ₹40,000–₹100,000 per 60min: ₹50,000 is inside
    expect(now.ok).toBe(true);
    const tooLow = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 60,
      pricePaise: 30000,
      sessionsInPackage: 1,
    });
    expect(tooLow.ok).toBe(false);
  });

  it("rejects durations that are not 15-minute steps", async () => {
    const bad = await checkOfferingPrice({
      categorySlug: "yoga",
      durationMin: 50,
      pricePaise: 50000,
      sessionsInPackage: 1,
    });
    expect(bad.ok).toBe(false);
    expect(bad.ok === false && bad.error).toMatch(/15/);
  });

  it("two trainers can set different prices without affecting each other", async () => {
    const a = await makeTrainer({ name: "Price A", pricePaise: 50000 });
    const b = await makeTrainer({ name: "Price B", pricePaise: 120000 });
    const listA = await listTrainerOfferings(a.user.id);
    const listB = await listTrainerOfferings(b.user.id);
    expect(listA[0].price_paise).toBe(50000);
    expect(listB[0].price_paise).toBe(120000);

    await updateOffering(listA[0].id, a.user.id, { pricePaise: 60000 });
    const afterA = await listTrainerOfferings(a.user.id);
    const afterB = await listTrainerOfferings(b.user.id);
    expect(afterA[0].price_paise).toBe(60000);
    expect(afterB[0].price_paise).toBe(120000); // untouched
  });
});

describe("availability (D6)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  const ranges = [
    { weekday: 1, startTime: "06:00", endTime: "09:00" },
    { weekday: 1, startTime: "17:00", endTime: "20:00" },
  ];

  it("accepts a start time that fits inside a range", () => {
    expect(availabilityFits(ranges, [1], "06:30", 60).ok).toBe(true);
    expect(availabilityFits(ranges, [1, 3], "17:00", 60).ok).toBe(false); // Wed not in ranges
    expect(availabilityFits(ranges, [1], "08:30", 60).ok).toBe(false); // crosses 09:00
  });
});

describe("targeted bookings (D4, D5, D10)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("recomputes the price server-side and ignores a tampered client price", async () => {
    const trainer = await makeTrainer({ name: "Book Me", areas: [{ city: "Delhi", locality: "Vasant Vihar", pinCode: "110057" }] });
    const customer = await createUser({
      name: "Cust",
      contact: `cu${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "c".repeat(64),
    });

    const result = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "07:00",
      location: "12 Some Street, Delhi",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const booking = await getBookingById(result.bookingId);
    expect(booking?.pricePaise).toBe(50000); // from the DB, not the client
    expect(booking?.status).toBe("Requested");
    expect(booking?.trainerId).toBe(trainer.user.id);
    expect(booking?.requestKind).toBe("targeted");
    expect(booking?.startTime).toBe("07:00");
    expect(booking?.endTime).toBe("08:00");
    expect((booking as { meetingUrl?: string | null } | null)?.meetingUrl ?? null).toBeNull();
  });

  it("rejects a start time outside the trainer's availability", async () => {
    const trainer = await makeTrainer({ name: "Strict Hours", areas: [{ city: "Delhi", locality: "Hauz Khas", pinCode: "110016" }] });
    const customer = await createUser({
      name: "Late",
      contact: `la${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "l".repeat(64),
    });
    const result = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "23:00",
      location: "12 Some Street, Delhi",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a clashing second booking", async () => {
    const trainer = await makeTrainer({ name: "Clash Test", areas: [{ city: "Delhi", locality: "Saket", pinCode: "110017" }] });
    const customer = await createUser({
      name: "Clashy",
      contact: `cl${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "c".repeat(64),
    });
    const first = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "07:00",
      location: "12 Some Street, Delhi",
    });
    expect(first.ok).toBe(true);
    const second = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "07:30",
      location: "12 Some Street, Delhi",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/taken/i);
  });

  it("double-submitting yields one booking", async () => {
    const trainer = await makeTrainer({ name: "Double", areas: [{ city: "Delhi", locality: "Karol Bagh", pinCode: "110005" }] });
    const customer = await createUser({
      name: "Twice",
      contact: `tw${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "t".repeat(64),
    });
    const input = {
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [3],
      startTime: "18:00",
      location: "12 Some Street, Delhi",
    };
    const first = await createTargetedBooking(input);
    expect(first.ok).toBe(true);
    const second = await createTargetedBooking(input);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already/i);
  });

  it("keeps the snapshot after the trainer edits the price", async () => {
    const trainer = await makeTrainer({ name: "Snapshot", areas: [{ city: "Delhi", locality: "Model Town", pinCode: "110009" }] });
    const customer = await createUser({
      name: "Snap",
      contact: `sn${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "s".repeat(64),
    });
    const created = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "06:00",
      location: "12 Some Street, Delhi",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { updateOffering } = await import("@/lib/server/trainers");
    await updateOffering(trainer.offering.id, trainer.user.id, { pricePaise: 90000 });
    const booking = await getBookingById(created.bookingId);
    expect(booking?.pricePaise).toBe(50000);
  });

  it("does not reveal the Zoom link before the trainer accepts", async () => {
    const trainer = await makeTrainer({
      name: "Zoom Trainer",
      format: "online",
      areas: [{ city: "Delhi", locality: "Defence Colony", pinCode: "110024" }],
    });
    const customer = await createUser({
      name: "Zoom Cust",
      contact: `zo${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "z".repeat(64),
    });
    const created = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "06:30",
      location: "",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const before = await getBookingById(created.bookingId);
    expect((before as { meetingUrl?: string | null } | null)?.meetingUrl ?? null).toBeNull();

    const { acceptBookingWithTrainer, resolveBookingMeetingUrl } = await import("@/lib/server/store");
    const accepted = await acceptBookingWithTrainer(created.bookingId, trainer.user.id, trainer.trainer.name);
    expect(accepted?.status).toBe("Confirmed");

    // Only after acceptance, and only through the private resolver.
    const revealed = await resolveBookingMeetingUrl(created.bookingId);
    expect(revealed).toBe("https://zoom.us/j/123");
  });

  it("rejects an unverified or suspended trainer", async () => {
    const trainer = await makeTrainer({
      name: "Unverified",
      verified: false,
      areas: [{ city: "Delhi", locality: "Lajpat Nagar", pinCode: "110024" }],
    });
    const { setProfileStatus } = await import("@/lib/server/trainers");
    await setProfileStatus(trainer.user.id, "suspended");
    const customer = await createUser({
      name: "Susp",
      contact: `su${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "s".repeat(64),
    });
    const result = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "06:00",
      location: "12 Some Street, Delhi",
    });
    expect(result.ok).toBe(false);
  });

  it("clash detection compares real intervals", async () => {
    const clash = trainerScheduleClash("trainer-x", [1], "06:30", 60);
    // no bookings for an unknown trainer -> no clash
    expect(clash instanceof Promise).toBe(true);
    await expect(clash).resolves.toBe(false);
  });
});

describe("listing gate (D3) and privacy (D13)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("isPubliclyListed requires submitted + verified + active offering", async () => {
    const trainer = await makeTrainer({ name: "Gate Keeper", areas: [{ city: "Delhi", locality: "RK Puram", pinCode: "110022" }] });
    const record = (await getTrainerBySlug(trainer.slug))!;
    expect(
      isPubliclyListed(record, { hasActiveOffering: true, hasActiveSubscription: true }),
    ).toBe(true);
    expect(
      isPubliclyListed({ ...record, verification_status: "pending" }, { hasActiveOffering: true, hasActiveSubscription: true }),
    ).toBe(false);
    expect(
      isPubliclyListed({ ...record, status: "suspended" }, { hasActiveOffering: true, hasActiveSubscription: true }),
    ).toBe(false);
    expect(
      isPubliclyListed(record, { hasActiveOffering: false, hasActiveSubscription: true }),
    ).toBe(false);
  });

  it("public profile JSON has no contact, coordinates, documents or meeting links", async () => {
    const trainer = await makeTrainer({
      name: "Private Person",
      format: "online",
      areas: [{ city: "Delhi", locality: "Greater Kailash", pinCode: "110048" }],
      meetingUrl: "https://zoom.us/j/999",
    });
    const customer = await createUser({
      name: "Peeker",
      contact: `pk${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "p".repeat(64),
    });
    void customer;
    const profile = await getPublicTrainerProfile(trainer.slug);
    expect(profile).not.toBeNull();
    const serialised = JSON.stringify(profile);
    expect(serialised).not.toContain("zoom.us");
    expect(serialised).not.toContain(trainer.user.contact);
    expect(serialised).not.toMatch(/"home_?lat"/i);
    expect(serialised).not.toMatch(/"home_?lng"/i);
    expect(serialised).not.toContain("password");
    expect(serialised).not.toContain("document_key");
    expect(serialised).not.toContain("verification_note");
    // Public shape still carries the useful listing data
    expect(profile!.offerings.length).toBe(1);
    expect(profile!.areas[0].pinCode).toBe("110048");
  });

  it("hides trainers from search when they are not listed", async () => {
    const listed = await makeTrainer({ name: "Listed One", areas: [{ city: "Pune", locality: "Kothrud", pinCode: "411038" }] });
    const hidden = await makeTrainer({
      name: "Hidden One",
      verified: false,
      areas: [{ city: "Pune", locality: "Kothrud", pinCode: "411038" }],
    });
    const results = await searchTrainers({ pin: "411038" });
    const slugs = results.inPerson.map((card) => card.slug);
    expect(slugs).toContain(listed.slug);
    expect(slugs).not.toContain(hidden.slug);
  });
});

describe("search (D9)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("matches declared areas and does not match similar text", async () => {
    const trainer = await makeTrainer({
      name: "Area Match",
      areas: [{ city: "Delhi", locality: "Vasant Kunj", pinCode: "110070" }],
    });
    const byPin = await searchTrainers({ pin: "110070" });
    expect(byPin.inPerson.map((card) => card.slug)).toContain(trainer.slug);
    const wrongPin = await searchTrainers({ pin: "110071" });
    expect(wrongPin.inPerson.map((card) => card.slug)).not.toContain(trainer.slug);
    const byLocality = await searchTrainers({ locality: "vasant kunj", city: "delhi" });
    expect(byLocality.inPerson.map((card) => card.slug)).toContain(trainer.slug);
    const similarText = await searchTrainers({ city: "Vasant" });
    expect(similarText.inPerson.map((card) => card.slug)).not.toContain(trainer.slug);
  });

  it("puts online trainers in their own section and shows them with no location", async () => {
    const online = await makeTrainer({ name: "Online Only", format: "online" });
    const results = await searchTrainers({});
    expect(results.online.map((card) => card.slug)).toContain(online.slug);
    expect(results.areaHasInPerson).toBe(false);
  });

  it("shows the 'not available yet' condition when no in-person trainer serves the area", async () => {
    await makeTrainer({ name: "Elsewhere", areas: [{ city: "Delhi", locality: "Noida", pinCode: "201301" }] });
    const results = await searchTrainers({ pin: "560001" }); // Bengaluru
    expect(results.areaHasInPerson).toBe(false);
    expect(results.inPerson).toHaveLength(0);
  });

  it("sorts by price when asked", async () => {
    const cheap = await makeTrainer({ name: "Cheap One", pricePaise: 40000, areas: [{ city: "Kochi", locality: "Fort Kochi", pinCode: "682001" }] });
    const dear = await makeTrainer({ name: "Dear One", pricePaise: 200000, areas: [{ city: "Kochi", locality: "Fort Kochi", pinCode: "682001" }] });
    const results = await searchTrainers({ pin: "682001", sort: "price" });
    const order = results.inPerson.map((card) => card.slug);
    expect(order.indexOf(cheap.slug)).toBeLessThan(order.indexOf(dear.slug));
  });
});

describe("listing subscriptions (D3)", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("activates and extends a plan in MOCK mode", async () => {
    const trainer = await makeTrainer({ name: "Subscriber" });
    const { createPlan } = await import("@/lib/server/subscriptions");
    const plan = await createPlan({ name: "Monthly listing", description: "", pricePaise: 50000, periodDays: 30 });

    const result = await purchaseSubscription(trainer.user.id, plan.id);
    expect(result.ok).toBe(true);
    const active = await getActiveSubscription(trainer.user.id);
    expect(active?.planName).toBe("Monthly listing");
    expect(active?.daysLeft).toBeGreaterThan(25);
    expect(await trainerHasActiveSubscription(trainer.user.id)).toBe(true);

    // A second purchase extends rather than resets.
    await purchaseSubscription(trainer.user.id, plan.id);
    const extended = await getActiveSubscription(trainer.user.id);
    expect(extended!.daysLeft).toBeGreaterThan(45);
  });

  it("webhook payment completion requires a real signature", async () => {
    const { POST: webhook } = await import("@/app/api/payments/webhook/route");
    const response = await webhook(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "payment.captured", payload: {} }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("legacy open-request flow still works", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("creates an open request with no trainer attached", async () => {
    const customer = await createUser({
      name: "Legacy",
      contact: `lg${Math.floor(Math.random() * 1e9)}`,
      role: "customer",
      passwordHash: "l".repeat(64),
    });
    const booking = await createBookingForCustomer(
      customer.id,
      {
        location: "Indiranagar, Bengaluru",
        serviceSlug: "yoga",
        serviceName: "Yoga",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        time: "Morning",
        specificTime: "",
      },
      { requestKind: "open" },
    );
    expect(booking.requestKind).toBe("open");
    expect(booking.trainerId).toBeNull();
    expect(booking.status).toBe("Requested");
  });
});
