"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container, Overline, ButtonLink, StatusBadge, LoadingSkeleton } from "@/components/ui";
import { SessionCard, PlanCard } from "@/components/cards";
import { MONTHLY_PLAN, TRIAL, DAYS, TIME_OPTIONS } from "@/lib/data";
import { CalendarIcon, ClockIcon, CheckIcon } from "@/components/Icons";
import {
  useBookings,
  cancelBooking,
  requestReschedule,
  confirmCompletion,
  markNoShow,
  type BookingRequest,
  type BookingStatus,
} from "@/lib/bookings";
import { useCurrentUser } from "@/lib/auth";
import { PayButton } from "@/components/PayButton";
import { RateBooking } from "@/components/RateBooking";
import { getMyReviewedIds } from "@/lib/reviews";
import { MONTHLY_PAISE, TRIAL_PAISE } from "@/lib/payments/pricing";

const NAV = [
  { label: "Home", href: "/", active: false },
  { label: "Services", href: "/services" },
  { label: "My Sessions", href: "/sessions", active: true },
  { label: "Plan", href: "/plans" },
  { label: "Profile", href: "/profile" },
];

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

type SessionItem = {
  key: string;
  bookingId: string;
  reference: string;
  service: string;
  trainer: string;
  day: string;
  date: string;
  time: string;
  status: BookingStatus;
};

function nextDateForDay(day: string) {
  const targetDay = DAY_INDEX[day];
  if (targetDay === undefined) return null;

  const date = new Date();
  let offset = (targetDay - date.getDay() + 7) % 7;
  if (offset === 0) offset = 7;
  date.setDate(date.getDate() + offset);
  return date;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function RescheduleRequestModal({ booking, onClose, onSubmitted }: { booking: BookingRequest; onClose: () => void; onSubmitted: () => void }) {
  const [selectedDays, setSelectedDays] = useState(booking.days);
  const [selectedTime, setSelectedTime] = useState(booking.time);
  const [specificTime, setSpecificTime] = useState(booking.specificTime);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleDay(day: string) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  }

  async function submit() {
    if (selectedDays.length !== 4 || (selectedTime === "Specific time" && !specificTime)) {
      setError("Select four preferred days and a valid time window.");
      return;
    }
    try {
      setLoading(true);
      await requestReschedule(booking.id, selectedDays, selectedTime, specificTime);
      onSubmitted();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to request a change.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/40 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-xl rounded-xl border border-forest-900/10 bg-white p-6 shadow-modal">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="t-overline text-terracotta-500">Request a change</p>
            <h2 className="pt-1 t-h3 text-charcoal-900">Propose new days and time</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-600 transition duration-200 ease-out hover:text-forest-900">×</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAYS.map((day) => {
            const selected = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={selected}
                className={`rounded-[10px] border px-3 py-2.5 text-body-sm font-semibold transition duration-200 ease-out ${
                  selected ? "border-forest-900 bg-forest-900 text-white" : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelectedTime(option)}
              aria-pressed={selectedTime === option}
              className={`rounded-[10px] border px-3 py-2.5 text-body-sm font-semibold transition duration-200 ease-out ${
                selectedTime === option ? "border-forest-900 bg-forest-900 text-white" : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {selectedTime === "Specific time" ? (
          <label className="mt-4 flex flex-col gap-2">
            <span className="t-overline text-muted-600">Specific time</span>
            <input
              type="time"
              value={specificTime}
              onChange={(event) => setSpecificTime(event.target.value)}
              className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
            />
          </label>
        ) : null}

        {error ? <p className="pt-3 text-body-sm text-error">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-[10px] px-5 py-3 text-body-sm font-semibold text-muted-600 transition duration-200 ease-out hover:text-charcoal-900">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-forest-900 px-6 text-[16px] font-semibold text-white transition duration-200 ease-out hover:bg-forest-800 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Request change"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionsDashboard() {
  const { user, loading: authLoading } = useCurrentUser();
  const { bookings, loading: bookingsLoading } = useBookings();
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingRequest | null>(null);
  const [actionError, setActionError] = useState("");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const currentBooking = bookings[bookings.length - 1];

  useEffect(() => {
    let cancelled = false;
    getMyReviewedIds().then((ids) => {
      if (!cancelled) setReviewedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [bookings.length]);

  async function runBookingAction(bookingId: string, action: "confirm" | "noshow") {
    try {
      setActionError("");
      if (action === "confirm") await confirmCompletion(bookingId);
      else await markNoShow(bookingId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed.");
    }
  }

  if (authLoading || bookingsLoading) {
    return (
      <Container className="py-20">
        <LoadingSkeleton lines={4} />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="flex max-w-2xl flex-col gap-5 py-20">
        <Overline>My Sessions</Overline>
        <h1 className="t-h1 text-charcoal-900">Sign in to view your sessions</h1>
        <p className="text-body text-muted-600">
          You can browse services and plans without an account. Session history and booking details
          require sign-in.
        </p>
        <ButtonLink href="/login?redirect=/sessions">Sign in</ButtonLink>
      </Container>
    );
  }

  if (user.role === "trainer") {
    return (
      <Container className="flex max-w-2xl flex-col gap-5 py-20">
        <Overline>Trainer account</Overline>
        <h1 className="t-h1 text-charcoal-900">Use the trainer dashboard</h1>
        <p className="text-body text-muted-600">
          Trainer accounts manage requests and accepted bookings from the trainer area.
        </p>
        <ButtonLink href="/trainer">Open trainer dashboard</ButtonLink>
      </Container>
    );
  }

  const sessions = bookings
    .flatMap((booking) =>
      booking.days.map((day): SessionItem | null => {
        const date = nextDateForDay(day);
        return date
          ? {
              key: `${booking.id}-${day}`,
              bookingId: booking.id,
              reference: booking.reference,
              service: booking.serviceName,
              trainer: booking.trainerName ?? "Awaiting trainer",
              day,
              date: formatDate(date),
              time:
                booking.time === "Specific time" && booking.specificTime
                  ? booking.specificTime
                  : booking.time,
              status: booking.status,
            }
          : null;
      }),
    )
    .filter((session): session is SessionItem => session !== null);

  const upcomingSessions = sessions.filter((session) =>
    ["Requested", "Accepted", "Confirmed", "Upcoming", "In Progress", "Rescheduled", "Reschedule Requested"].includes(
      session.status,
    ),
  );
  const pastSessions = sessions.filter((session) =>
    ["Completed", "No Show", "Cancelled"].includes(session.status),
  );

  const accepted = bookings.filter((booking) => booking.status === "Confirmed");
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const rateable = bookings.filter(
    (booking) =>
      booking.status === "Completed" && booking.trainerName && !reviewedIds.has(booking.id),
  );

  return (
    <>
      <section className="border-b border-forest-900/10 bg-ivory-50 py-10 md:py-14">
        <Container className="flex flex-col gap-5">
          <Overline>Customer dashboard</Overline>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="t-h1 text-charcoal-900">My Sessions</h1>
              <p className="pt-1.5 text-body text-muted-600">
                Your requested sessions, accepted bookings and plan — all in one place.
              </p>
            </div>
            <ButtonLink href="/book">Book a Trial</ButtonLink>
          </div>

          <nav aria-label="Customer" className="flex flex-wrap gap-2 pt-1">
            {NAV.map((item, index) =>
              item.active ? (
                <span
                  key={item.label + index}
                  aria-current="page"
                  className="rounded-pill bg-forest-900 px-4 py-2 text-body-sm font-semibold text-white"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.label + index}
                  href={item.href}
                  className="rounded-pill border border-forest-900/15 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/40"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </Container>
      </section>

      <section className="py-12 md:py-16">
        <Container className="grid items-start gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:gap-10">
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: String(upcomingSessions.length), label: "Requested days" },
                { value: String(accepted.length), label: "Confirmed bookings" },
                { value: TRIAL.price, label: "Trial price" },
                { value: "24h+", label: "Advance booking" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-xl border border-forest-900/8 bg-white p-4 shadow-sm"
                >
                  <p className="text-body-md text-forest-900">{tile.value}</p>
                  <p className="pt-0.5 text-caption text-muted-600">{tile.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="t-h3 text-charcoal-900">
                  {accepted.length > 0 ? "Upcoming sessions" : "Requested trial days"}
                </h2>
                <span className="rounded-pill bg-forest-900/8 px-3 py-1 text-caption font-semibold text-forest-900">
                  {upcomingSessions.length}
                </span>
              </div>

              {actionError ? <p className="text-body-sm text-error">{actionError}</p> : null}

              {upcomingSessions.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {upcomingSessions.map(({ key, ...sessionProps }) => (
                    <SessionCard
                      key={key}
                      {...sessionProps}
                      onCancel={() => void cancelBooking(sessionProps.bookingId)}
                      onReschedule={() =>
                        setRescheduleTarget(
                          bookings.find((booking) => booking.id === sessionProps.bookingId) ?? null,
                        )
                      }
                      showConfirm={
                        sessionProps.status === "Completed" &&
                        bookingById.get(sessionProps.bookingId)?.customerConfirmed === false
                      }
                      onConfirmCompletion={() => void runBookingAction(sessionProps.bookingId, "confirm")}
                      onMarkNoShow={() => void runBookingAction(sessionProps.bookingId, "noshow")}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center shadow-sm">
                  <p className="t-h4 text-charcoal-900">No sessions requested yet</p>
                  <p className="pt-2 text-body-sm text-muted-600">
                    Start a trial request to see your selected days, preferred time and trainer status here.
                  </p>
                  <div className="pt-5">
                    <ButtonLink href="/book">Book a Trial</ButtonLink>
                  </div>
                </div>
              )}

              {pastSessions.length > 0 ? (
                <div className="flex flex-col gap-4 pt-2">
                  <h2 className="t-h3 text-charcoal-900">Past sessions</h2>                  <div className="grid gap-4 sm:grid-cols-2">
                    {pastSessions.map(({ key, ...sessionProps }) => (
                      <SessionCard
                        key={key}
                        {...sessionProps}
                        showConfirm={
                          sessionProps.status === "Completed" &&
                          bookingById.get(sessionProps.bookingId)?.customerConfirmed === false
                        }
                        onConfirmCompletion={() => void runBookingAction(sessionProps.bookingId, "confirm")}
                        onMarkNoShow={() => void runBookingAction(sessionProps.bookingId, "noshow")}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {rateable.length > 0 ? (
                <div className="flex flex-col gap-4 pt-2">
                  <h2 className="t-h3 text-charcoal-900">Rate your trainer</h2>
                  {rateable.map((booking) => (
                    <div key={booking.id} className="flex flex-col gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
                      <p className="text-body-md text-charcoal-900">
                        {booking.serviceName} <span className="text-body-sm text-muted-600">with {booking.trainerName} · {booking.reference}</span>
                      </p>
                      <RateBooking
                        bookingId={booking.id}
                        onRated={() => {
                          void getMyReviewedIds().then(setReviewedIds);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline pb-4 text-terracotta-500">Scheduling</p>
              <ul className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: CalendarIcon, text: "Book 24+ hours in advance" },
                  { icon: ClockIcon, text: "Morning, afternoon or evening" },
                  { icon: CheckIcon, text: "Changes need the other party's OK" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.text}
                      className="flex items-start gap-2.5 text-body-sm text-charcoal-900"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-forest-900/8 text-forest-900">
                        <Icon size={14} />
                      </span>
                      {item.text}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline pb-4 text-muted-600">Current booking</p>
              {currentBooking ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="t-h4 text-charcoal-900">{TRIAL.name}</p>
                      <p className="pt-0.5 text-body-sm text-muted-600">
                        {currentBooking.serviceName}
                      </p>
                      <p className="pt-1 text-caption text-muted-600">
                        Reference {currentBooking.reference}
                      </p>
                    </div>
                    <StatusBadge status={currentBooking.status} />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2 border-t border-forest-900/8 pt-4">
                    <span className="text-body-sm text-muted-600 line-through">
                      {TRIAL.regularPrice}
                    </span>
                    <span className="t-h2 text-forest-900">{TRIAL.price}</span>
                  </div>
                  {(currentBooking.status === "Confirmed" || currentBooking.status === "Accepted") && (
                    <div className="pt-4">
                      <PayButton bookingId={currentBooking.id} amountPaise={TRIAL_PAISE} />
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="t-h4 text-charcoal-900">{TRIAL.name}</p>
                  <p className="pt-1 text-body-sm text-muted-600">
                    Create a booking request to see it here.
                  </p>
                </div>
              )}
            </div>

            <PlanCard />

            <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-6">
              <p className="t-h4 text-charcoal-900">Continue training</p>
              <p className="pt-1.5 text-body-sm text-muted-600">
                The {MONTHLY_PLAN.name} keeps your preferred schedule going at{" "}
                {MONTHLY_PLAN.price} / {MONTHLY_PLAN.period}.
              </p>
              {currentBooking && (currentBooking.status === "Confirmed" || currentBooking.status === "Accepted") ? (
                <div className="pt-4">
                  <PayButton bookingId={currentBooking.id} amountPaise={MONTHLY_PAISE} plan="monthly" />
                </div>
              ) : (
                <div className="pt-4">
                  <ButtonLink href="/plans" variant="secondary" className="w-full">
                    View plans
                  </ButtonLink>
                </div>
              )}
            </div>
          </aside>
        </Container>
      </section>

      {rescheduleTarget ? (
        <RescheduleRequestModal
          booking={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSubmitted={() => setRescheduleTarget(null)}
        />
      ) : null}
    </>
  );
}
