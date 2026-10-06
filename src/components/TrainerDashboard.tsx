"use client";

import { useEffect, useState } from "react";
import { Container, Overline, ButtonLink, StatusBadge, LoadingSkeleton } from "@/components/ui";
import { Button } from "@/components/ui";
import { CalendarIcon, ClockIcon, LocationIcon, CrosshairIcon } from "@/components/Icons";
import {
  useBookings,
  acceptBooking,
  acceptReschedule,
  declineReschedule,
  startSession,
  completeSession,
  markNoShow,
} from "@/lib/bookings";
import { SERVICES } from "@/lib/data";
import { useCurrentUser } from "@/lib/auth";
import { getCurrentLocation, getCurrentLocationErrorMessage } from "@/lib/geolocation";
import { DEFAULT_MATCH_RADIUS_KM, formatKm } from "@/lib/geo";
import { EarningsPanel } from "@/components/EarningsPanel";
import { TrainerReviews } from "@/components/TrainerReviews";

export function TrainerDashboard() {
  const { user, loading: authLoading } = useCurrentUser();
  const [fix, setFix] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const { bookings, loading: bookingsLoading } = useBookings(
    fix ? { lat: fix.lat, lng: fix.lng, radiusKm: DEFAULT_MATCH_RADIUS_KM } : null,
  );
  const requests = bookings.filter((booking) => booking.status === "Requested");
  const accepted = bookings.filter((booking) => booking.status === "Confirmed");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // New customer requests appear without a manual refresh.
  useEffect(() => {
    const timer = setInterval(() => {
      window.dispatchEvent(new Event("aramya:bookingsChanged"));
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const filteredBookings = bookings.filter(
    (booking) =>
      (serviceFilter === "All" || booking.serviceSlug === serviceFilter) &&
      (statusFilter === "All" || booking.status === statusFilter),
  );

  async function acceptRequest(id: string) {
    try {
      setAcceptingId(id);
      setAcceptError("");
      await acceptBooking(id);
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : "Unable to accept request.");
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleAcceptReschedule(id: string) {
    try {
      setAcceptError("");
      await acceptReschedule(id);
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : "Unable to accept new time.");
    }
  }

  async function handleDeclineReschedule(id: string) {
    try {
      setAcceptError("");
      await declineReschedule(id);
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : "Unable to keep current time.");
    }
  }

  async function runLifecycle(id: string, action: "start" | "complete" | "noshow", fallback: string) {
    try {
      setActingId(id);
      setAcceptError("");
      if (action === "start") await startSession(id);
      else if (action === "complete") await completeSession(id);
      else await markNoShow(id);
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : fallback);
    } finally {
      setActingId(null);
    }
  }

  async function locateMe() {
    setLocating(true);
    setGeoError("");
    try {
      const current = await getCurrentLocation();
      setFix({
        lat: current.coordinates.latitude,
        lng: current.coordinates.longitude,
        label: current.label,
      });
    } catch (error) {
      setFix(null);
      setGeoError(getCurrentLocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }

  if (authLoading || bookingsLoading) {
    return (
      <section className="py-14 md:py-20">
        <Container>
          <LoadingSkeleton lines={4} />
        </Container>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="py-14 md:py-20">
        <Container className="flex max-w-2xl flex-col gap-5">
          <Overline>Trainer dashboard</Overline>
          <h1 className="t-h1 text-charcoal-900">Sign in to use the trainer area</h1>
          <p className="text-body text-muted-600">
            Requests, acceptance and schedule tools are only available after trainer sign-in.
          </p>
          <ButtonLink href="/login?redirect=/trainer">Sign in as trainer</ButtonLink>
        </Container>
      </section>
    );
  }

  if (user.role !== "trainer") {
    return (
      <section className="py-14 md:py-20">
        <Container className="flex max-w-2xl flex-col gap-5">
          <Overline>Trainer dashboard</Overline>
          <h1 className="t-h1 text-charcoal-900">Trainer account required</h1>
          <p className="text-body text-muted-600">
            Sign in with a trainer account to review and accept requests.
          </p>
          <ButtonLink href="/login?redirect=/trainer">Use trainer login</ButtonLink>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-14 md:py-20">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Overline>Trainer dashboard</Overline>
          <h1 className="t-h1 text-charcoal-900">Nearby requests</h1>
          <p className="max-w-2xl text-body text-muted-600">
            Review customer trial requests, accept the ones that fit your schedule, and track
            what you have already accepted.
          </p>
        </div>

        {!user.verified ? (
          <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4 shadow-sm">
            <p className="text-body-md text-charcoal-900">Verification pending</p>
            <p className="text-body-sm text-muted-600">
              You can browse requests, but accepting opens after the org verifies your account. New signups are usually reviewed within a day.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 rounded-xl border border-forest-900/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => void locateMe()} disabled={locating}>
              <CrosshairIcon size={17} /> {locating ? "Locating…" : fix ? "Refresh my location" : "Use my exact location"}
            </Button>
            {fix ? (
              <p className="text-body-sm text-muted-600">📍 {fix.label} — showing requests within {DEFAULT_MATCH_RADIUS_KM} km, nearest first.</p>
            ) : (
              <p className="text-body-sm text-muted-600">Showing all requests. Capture your location to filter nearby ones.</p>
            )}
          </div>
          {geoError ? <p className="text-body-sm text-error">{geoError}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
            <p className="text-body-md text-forest-900">{requests.length}</p>
            <p className="pt-0.5 text-caption text-muted-600">Open requests</p>
          </div>
          <div className="rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
            <p className="text-body-md text-forest-900">{accepted.length}</p>
            <p className="pt-0.5 text-caption text-muted-600">Accepted bookings</p>
          </div>
          <div className="rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
            <p className="text-body-md text-forest-900">{bookings.length}</p>
            <p className="pt-0.5 text-caption text-muted-600">Total saved requests</p>
          </div>
        </div>

        <EarningsPanel />

        <TrainerReviews />

        <div className="grid gap-3 rounded-xl border border-forest-900/10 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-muted-600">Service</span>
            <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none">
              <option value="All">All services</option>
              {SERVICES.map((service) => <option key={service.slug} value={service.slug}>{service.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-muted-600">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none">
              <option value="All">All statuses</option>
              {["Requested", "Confirmed", "Reschedule Requested", "Rescheduled", "Cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center shadow-sm">
              <p className="t-h4 text-charcoal-900">{bookings.length === 0 ? "No customer requests yet" : "No matching requests"}</p>
              <p className="pt-2 text-body-sm text-muted-600">
                {bookings.length === 0
                  ? fix
                    ? `No requests within ${DEFAULT_MATCH_RADIUS_KM} km of you. New nearby requests appear here automatically.`
                    : "When a customer posts a trial request, it appears here automatically."
                  : "Try a different service or status filter."}
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="flex flex-col gap-4 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="t-h4 text-charcoal-900">{booking.serviceName}</h2>
                    <p className="pt-0.5 inline-flex items-center gap-1.5 text-body-sm text-muted-600">
                      <LocationIcon size={15} className="shrink-0" /> {booking.location}
                    </p>
                    {booking.distanceKm != null ? (
                      <p className="pt-0.5 text-caption font-semibold text-forest-900">
                        {formatKm(booking.distanceKm)}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(booking.status === "Reschedule Requested" && booking.proposedDays ? booking.proposedDays : booking.days).map((day) => (
                    <span
                      key={day}
                      className="rounded-sm bg-ivory-50 px-3 py-1.5 text-caption font-semibold text-charcoal-900"
                    >
                      {day.slice(0, 3)}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-body-sm text-charcoal-900">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon size={15} className="shrink-0 text-muted-600" />
                    Four sessions requested
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon size={15} className="shrink-0 text-muted-600" />
                    {booking.status === "Reschedule Requested" && booking.proposedTime
                      ? booking.proposedTime === "Specific time" && booking.proposedSpecificTime
                        ? booking.proposedSpecificTime
                        : booking.proposedTime
                      : booking.time === "Specific time" && booking.specificTime
                        ? booking.specificTime
                        : booking.time}
                  </span>
                </div>

                {booking.status === "Requested" ? (
                  <Button
                    type="button"
                    onClick={() => void acceptRequest(booking.id)}
                    disabled={acceptingId === booking.id}
                  >
                    {acceptingId === booking.id ? "Accepting..." : "Accept this request"}
                  </Button>
                ) : null}

                {booking.status === "Reschedule Requested" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void handleAcceptReschedule(booking.id)}>
                      Accept new time
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void handleDeclineReschedule(booking.id)}>
                      Keep current
                    </Button>
                  </div>
                ) : null}

                {booking.status === "Confirmed" || booking.status === "Rescheduled" ? (
                  <p className="text-body-sm font-semibold text-success">
                    Accepted by {booking.trainerName ?? "you"}
                  </p>
                ) : null}

                {(booking.status === "Confirmed" || booking.status === "Rescheduled") && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void runLifecycle(booking.id, "start", "Unable to start session.")}
                    disabled={actingId === booking.id}
                  >
                    {actingId === booking.id ? "Starting…" : "Start session"}
                  </Button>
                )}

                {booking.status === "In Progress" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void runLifecycle(booking.id, "complete", "Unable to complete session.")}
                      disabled={actingId === booking.id}
                    >
                      {actingId === booking.id ? "Completing…" : "Mark completed"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void runLifecycle(booking.id, "noshow", "Unable to flag no-show.")}
                      disabled={actingId === booking.id}
                    >
                      Customer no-show
                    </Button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {acceptError ? <p className="text-body-sm text-error">{acceptError}</p> : null}
      </Container>
    </section>
  );
}
