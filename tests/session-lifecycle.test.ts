import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { setupTestDatabase } from "./helpers/db";
import { hashPassword } from "@/lib/server/password";
import { createUser, getBookingById } from "@/lib/server/store";
import {
  getTrainerByUserId,
  insertOffering,
  replaceTrainerAreas,
  replaceTrainerAvailability,
  replaceTrainerCategories,
  setVerificationStatus,
  submitTrainerProfile,
  updateTrainerBasics,
} from "@/lib/server/trainers";
import { createTargetedBooking } from "@/lib/server/booking";
import { createReview, getReviewForBooking } from "@/lib/server/reviews";
import { updateBookingStatus } from "@/lib/server/store";
import { upsertPricingLimit } from "@/lib/server/pricing";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as sessionRoute } from "@/app/api/bookings/[id]/session/route";
import { POST as confirmRoute } from "@/app/api/bookings/[id]/confirm/route";
import { POST as reviewRoute } from "@/app/api/reviews/route";
import { POST as rescheduleRoute } from "@/app/api/bookings/[id]/reschedule/route";
import { POST as targetedRoute } from "@/app/api/bookings/targeted/route";

const db = await setupTestDatabase();

async function reset() {
  await db.reset();
  await upsertPricingLimit({ categorySlug: null, minPaise: 20000, maxPaise: 500000 });
}

const HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

async function cookieFor(contact: string, role: "trainer" | "customer") {
  const response = await loginRoute(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ contact, password: "password123", role }),
    }),
  );
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

async function makeListedTrainer(name: string) {
  const contact = `tr${Math.floor(Math.random() * 1e9)}`;
  const user = await createUser({ name, contact, role: "trainer", passwordHash: hashPassword("password123") });
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) throw new Error("no profile");
  await updateTrainerBasics(user.id, {
    bio: "A trainer biography long enough to satisfy every onboarding validation rule.",
    yearsExperience: 5,
    languages: ["English"],
  });
  await replaceTrainerCategories(user.id, [{ slug: "yoga", primary: true }]);
  await replaceTrainerAreas(user.id, [{ city: "Delhi", locality: "Vasant Vihar", pinCode: "110057" }]);
  await replaceTrainerAvailability(user.id, [
    { weekday: 1, startTime: "06:00", endTime: "10:00" },
    { weekday: 3, startTime: "17:00", endTime: "21:00" },
  ]);
  const offering = await insertOffering(user.id, {
    categorySlug: "yoga",
    format: "home_visit",
    durationMin: 60,
    pricePaise: 60000,
    sessionsInPackage: 1,
    active: true,
  });
  await submitTrainerProfile(user.id);
  await setVerificationStatus(user.id, "verified", null, "test");
  return { user, trainer, offering, slug: trainer.slug };
}

async function makeCustomer() {
  const contact = `cu${Math.floor(Math.random() * 1e9)}`;
  return createUser({ name: "Customer", contact, role: "customer", passwordHash: hashPassword("password123") });
}

describe("session lifecycle and reviews", () => {
  beforeAll(reset);
  afterAll(db.teardown);

  it("moves a confirmed targeted booking through the lifecycle", async () => {
    const trainer = await makeListedTrainer("Lifecycle Trainer");
    const customer = await makeCustomer();
    const created = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "07:00",
      location: "12 Some Street, Delhi",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const trainerCookie = await cookieFor(trainer.user.contact, "trainer");
    const customerCookie = await cookieFor(customer.contact, "customer");

    // Before acceptance, lifecycle actions are rejected.
    const tooEarly = await sessionRoute(
      new Request("http://localhost/api/bookings/x/session", {
        method: "POST",
        headers: { ...HEADERS, cookie: trainerCookie },
        body: JSON.stringify({ action: "start" }),
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(tooEarly.status).toBe(409);

    const { acceptBookingWithTrainer } = await import("@/lib/server/store");
    await acceptBookingWithTrainer(created.bookingId, trainer.user.id, trainer.trainer.name);

    // start -> in progress
    const started = await sessionRoute(
      new Request("http://localhost/api/bookings/x/session", {
        method: "POST",
        headers: { ...HEADERS, cookie: trainerCookie },
        body: JSON.stringify({ action: "start" }),
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(started.status).toBe(200);
    expect((await getBookingById(created.bookingId))?.status).toBe("In Progress");

    // complete
    const completed = await sessionRoute(
      new Request("http://localhost/api/bookings/x/session", {
        method: "POST",
        headers: { ...HEADERS, cookie: trainerCookie },
        body: JSON.stringify({ action: "complete" }),
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(completed.status).toBe(200);

    // A customer cannot run trainer lifecycle actions.
    const forbidden = await sessionRoute(
      new Request("http://localhost/api/bookings/x/session", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
        body: JSON.stringify({ action: "noshow" }),
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(forbidden.status).toBe(401);
  });

  it("lets the customer confirm their own session, then review it once", async () => {
    const trainer = await makeListedTrainer("Confirm Trainer");
    const customer = await makeCustomer();
    const created = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [3],
      startTime: "18:00",
      location: "12 Some Street, Delhi",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { acceptBookingWithTrainer } = await import("@/lib/server/store");
    await acceptBookingWithTrainer(created.bookingId, trainer.user.id, trainer.trainer.name);

    const customerCookie = await cookieFor(customer.contact, "customer");
    const confirmed = await confirmRoute(
      new Request("http://localhost/api/bookings/x/confirm", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(confirmed.status).toBe(200);
    expect((await getBookingById(created.bookingId))?.status).toBe("Completed");

    const review = await reviewRoute(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
        body: JSON.stringify({ bookingId: created.bookingId, rating: 5, comment: "Excellent session." }),
      }),
    );
    expect(review.status).toBe(201);

    // One review per booking.
    const second = await reviewRoute(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
        body: JSON.stringify({ bookingId: created.bookingId, rating: 4, comment: "Again." }),
      }),
    );
    expect(second.status).toBe(409);
  });

  it("rejects a review before the session is completed", async () => {
    const trainer = await makeListedTrainer("Early Reviewer");
    const customer = await makeCustomer();
    const created = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "08:00",
      location: "12 Some Street, Delhi",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const customerCookie = await cookieFor(customer.contact, "customer");
    const response = await reviewRoute(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
        body: JSON.stringify({ bookingId: created.bookingId, rating: 5, comment: "Too early." }),
      }),
    );
    expect(response.status).toBe(409);
  });

  it("reschedules a targeted booking inside the trainer's availability", async () => {
    const trainer = await makeListedTrainer("Reschedule Trainer");
    const customer = await makeCustomer();
    const created = await createTargetedBooking({
      customerId: customer.id,
      trainerSlug: trainer.slug,
      offeringId: trainer.offering.id,
      weekdays: [1],
      startTime: "07:00",
      location: "12 Some Street, Delhi",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const customerCookie = await cookieFor(customer.contact, "customer");
    const response = await rescheduleRoute(
      new Request("http://localhost/api/bookings/x/reschedule", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
        body: JSON.stringify({ weekdays: [3], startTime: "19:00" }),
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(response.status).toBe(200);
    const booking = await getBookingById(created.bookingId);
    expect(booking?.status).toBe("Reschedule Requested");
    expect(booking?.proposedSpecificTime).toBe("19:00");

    // A time outside availability is rejected.
    const bad = await rescheduleRoute(
      new Request("http://localhost/api/bookings/x/reschedule", {
        method: "POST",
        headers: { ...HEADERS, cookie: customerCookie },
        body: JSON.stringify({ weekdays: [1], startTime: "23:30" }),
      }),
      { params: Promise.resolve({ id: created.bookingId }) },
    );
    expect(bad.status).toBe(400);

    // Accepting applies the new time and derives the end time from the duration.
    const { acceptReschedule } = await import("@/lib/server/store");
    const applied = await acceptReschedule(created.bookingId);
    expect(applied?.status).toBe("Rescheduled");
    expect(applied?.startTime).toBe("19:00");
    expect(applied?.endTime).toBe("20:00");
  });

  it("keeps the legacy four-day reschedule shape working", async () => {
    const customer = await makeCustomer();
    const { createBookingForCustomer } = await import("@/lib/server/store");
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
    const cookie = await cookieFor(customer.contact, "customer");
    const response = await rescheduleRoute(
      new Request("http://localhost/api/bookings/x/reschedule", {
        method: "POST",
        headers: { ...HEADERS, cookie },
        body: JSON.stringify({ days: ["Friday", "Saturday", "Sunday", "Monday"], time: "Evening" }),
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(response.status).toBe(200);
    const updated = await getBookingById(booking.id);
    expect(updated?.status).toBe("Reschedule Requested");
    expect(updated?.proposedDays).toEqual(["Friday", "Saturday", "Sunday", "Monday"]);
  });
});
