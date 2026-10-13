"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Overline, ButtonLink, StatusBadge } from "@/components/ui";
import { SessionCard } from "@/components/cards";
import { DAYS, TIME_OPTIONS } from "@/lib/data";
import { CalendarIcon, ClockIcon, CheckIcon } from "@/components/Icons";
import {
  useBookings,
  cancelBooking,
  requestReschedule,
  type BookingRequest,
  type BookingStatus,
} from "@/lib/bookings";
import { useCurrentUser } from "@/lib/auth";

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
  const currentBooking = bookings[bookings.length - 1];

  if (authLoading || bookingsLoading) {
    return (
      <Container className="py-20">
        <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-body text-muted-600 shadow-sm">
          Loading your dashboard...
        </p>
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
    .filter((session): session is SessionItem => session !== null)
    .filter((session) =>
      ["Requested", "Accepted", "Confirmed", "Upcoming", "In Progress", "Rescheduled", "Reschedule Requested"].includes(
        session.status,
      ),
    );

  const accepted = bookings.filter((booking) => booking.status === "Confirmed");

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
            <ButtonLink href="/trainers">Find a trainer</ButtonLink>
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
                { value: String(sessions.length), label: "Requested days" },
                { value: String(accepted.length), label: "Confirmed bookings" },
                { value: currentBooking?.trainerName ?? "—", label: "Your trainer" },
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
                  {accepted.length > 0 ? "Upcoming sessions" : "Your requests"}
                </h2>
                <span className="rounded-pill bg-forest-900/8 px-3 py-1 text-caption font-semibold text-forest-900">
                  {sessions.length}
                </span>
              </div>

              {sessions.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {sessions.map(({ key, ...sessionProps }) => (
                    <SessionCard
                      key={key}
                      {...sessionProps}
                      onCancel={() => void cancelBooking(sessionProps.bookingId)}
                      onReschedule={() =>
                        setRescheduleTarget(
                          bookings.find((booking) => booking.id === sessionProps.bookingId) ?? null,
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center shadow-sm">
                  <p className="t-h4 text-charcoal-900">No sessions requested yet</p>
                  <p className="pt-2 text-body-sm text-muted-600">
                    Send a request to a trainer to see your chosen days, time and status here.
                  </p>
                  <div className="pt-5">
                    <ButtonLink href="/trainers">Find a trainer</ButtonLink>
                  </div>
                </div>
              )}
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
                      <p className="t-h4 text-charcoal-900">{currentBooking.serviceName}</p>
                      <p className="pt-0.5 text-body-sm text-muted-600">
                        with {currentBooking.trainerName ?? "your trainer"}
                      </p>
                      <p className="pt-1 text-caption text-muted-600">
                        Reference {currentBooking.reference}
                      </p>
                    </div>
                    <StatusBadge status={currentBooking.status} />
                  </div>
                  <div className="mt-4 border-t border-forest-900/8 pt-4">
                    <p className="text-body-sm text-muted-600">
                      Payment is arranged directly with your trainer.
                      {currentBooking.pricePaise
                        ? ` Agreed price: ₹${(currentBooking.pricePaise / 100).toLocaleString("en-IN")}.`
                        : ""}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="t-h4 text-charcoal-900">No booking yet</p>
                  <p className="pt-1 text-body-sm text-muted-600">
                    Send a booking request to a trainer and it appears here.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-6">
              <p className="t-h4 text-charcoal-900">How pricing works</p>
              <p className="pt-1.5 text-body-sm text-muted-600">
                Each trainer sets their own prices, and payment is arranged directly with them.
              </p>
              <div className="pt-4">
                <ButtonLink href="/plans" variant="secondary" className="w-full">
                  How pricing works
                </ButtonLink>
              </div>
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
