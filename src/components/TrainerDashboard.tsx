"use client";

// ARAMYA trainer workspace — requests, offerings, availability, areas, subscription.
// Everything is scoped to the signed-in trainer (the server resolves the id).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Overline, ButtonLink, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui";
import { CalendarIcon, ClockIcon, MapPinIcon } from "@/components/Icons";
import {
  acceptRequest,
  declineRequest,
  setSessionState,
  fetchRequests,
  fetchSubscription,
  fetchTrainerProfile,
  purchaseSubscription,
  cancelSubscription,
  type TrainerProfile,
} from "@/lib/trainer-api";
import { useCurrentUser } from "@/lib/auth";
import type { BookingRequest } from "@/lib/models";

type TrainerBooking = BookingRequest & { meetingUrl?: string | null };

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function statusTone(status: string) {
  if (status === "Confirmed" || status === "Rescheduled") return "text-success";
  if (status === "Declined" || status === "Expired" || status === "Cancelled") return "text-error";
  return "text-muted-600";
}

export function TrainerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useCurrentUser();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [requests, setRequests] = useState<TrainerBooking[]>([]);
  const [openRequests, setOpenRequests] = useState<BookingRequest[]>([]);
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof fetchSubscription>> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [profileData, requestData] = await Promise.all([fetchTrainerProfile(), fetchRequests()]);
    setProfile(profileData);
    setRequests(requestData.targeted);
    setOpenRequests(requestData.open);
  }

  useEffect(() => {
    if (authLoading || !user || user.role !== "trainer") return;
    let cancelled = false;
    async function load() {
      try {
        const [profileData, requestData, subscriptionData] = await Promise.all([
          fetchTrainerProfile(),
          fetchRequests(),
          fetchSubscription(),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setRequests(requestData.targeted);
        setOpenRequests(requestData.open);
        setSubscription(subscriptionData);
        if (profileData.trainer.status !== "submitted") {
          router.replace("/trainer/onboarding");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load your dashboard.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  const grouped = useMemo(() => {
    const pending = requests.filter((booking) => booking.status === "Requested");
    const upcoming = requests.filter((booking) => booking.status === "Confirmed" || booking.status === "Rescheduled");
    const past = requests.filter((booking) =>
      ["Completed", "Cancelled", "Declined", "Expired", "No Show", "Disputed"].includes(booking.status),
    );
    return { pending, upcoming, past };
  }, [requests]);

  if (authLoading) {
    return (
      <section className="py-14 md:py-20">
        <Container>
          <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-body text-muted-600 shadow-sm">
            Loading trainer dashboard...
          </p>
        </Container>
      </section>
    );
  }

  if (!user || user.role !== "trainer") {
    return (
      <section className="py-14 md:py-20">
        <Container className="flex max-w-2xl flex-col gap-5">
          <Overline>Trainer dashboard</Overline>
          <h1 className="t-h1 text-charcoal-900">Trainer account required</h1>
          <p className="text-body text-muted-600">
            Sign in with a trainer account to see requests, offerings and availability.
          </p>
          <ButtonLink href="/login?redirect=/trainer">Sign in as trainer</ButtonLink>
        </Container>
      </section>
    );
  }

  async function updateSession(id: string, action: "start" | "complete" | "noshow") {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await setSessionState(id, action);
      await refresh();
      setNotice(
        action === "start"
          ? "Session started."
          : action === "complete"
            ? "Session marked completed — the customer can now review you."
            : "Marked as a no-show.",
      );
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Could not update the session.");
    } finally {
      setBusyId(null);
    }
  }

  async function answer(id: string, action: "accept" | "decline") {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      if (action === "accept") await acceptRequest(id);
      else await declineRequest(id);
      await refresh();
      setNotice(action === "accept" ? "Request accepted." : "Request declined.");
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "Could not update the request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="py-14 md:py-20">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Overline>Trainer dashboard</Overline>
          <h1 className="t-h1 text-charcoal-900">Requests and your profile</h1>
          <p className="max-w-2xl text-body text-muted-600">
            Targeted requests arrive from customers who chose you. Accept or decline, and keep your
            offerings, prices and availability up to date.
          </p>
        </div>

        {profile ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusTile
              label="Verification"
              value={
                profile.trainer.verificationStatus === "verified"
                  ? "Verified"
                  : profile.trainer.verificationStatus === "rejected"
                    ? "Rejected"
                    : "Pending review"
              }
              hint={
                profile.trainer.verificationNote
                  ? profile.trainer.verificationNote
                  : profile.trainer.verificationStatus === "verified"
                    ? "You are listed to customers."
                    : "Customers only see you once verified."
              }
            />
            <StatusTile
              label="Trainer code"
              value={profile.trainer.trainerCode}
              hint="Reference for support."
            />
            <StatusTile
              label="Open requests"
              value={String(grouped.pending.length)}
              hint="Awaiting your answer."
            />
            <StatusTile
              label="Listing"
              value={
                subscription?.active
                  ? `Active · ${subscription.active.daysLeft} days left`
                  : subscription?.listingFeeRequired
                    ? "No active subscription"
                    : "Free listing"
              }
              hint={
                subscription?.listingFeeRequired && !subscription.active
                  ? "Renew to stay visible to customers."
                  : "You are visible in search."
              }
            />
          </div>
        ) : null}

        {subscription?.listingFeeRequired && subscription.plans.length > 0 ? (
          <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
            <p className="t-overline text-terracotta-500">Listing subscription</p>
            <p className="pt-2 text-body-sm text-muted-600">
              {subscription.active
                ? `Your listing is active until ${new Date(subscription.active.expiresAt).toLocaleDateString("en-IN")}.`
                : "Your profile is hidden from discovery until a plan is active. Confirmed bookings are unaffected."}
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              {subscription.plans.map((plan) => (
                <div key={plan.id} className="flex flex-col gap-2 rounded-xl border border-forest-900/10 bg-ivory-50 p-4">
                  <p className="text-body font-semibold text-charcoal-900">{plan.name}</p>
                  <p className="text-body-sm text-muted-600">
                    ₹{(plan.pricePaise / 100).toLocaleString("en-IN")} · {plan.periodDays} days
                  </p>
                  <Button
                    size="sm"
                    onClick={async () => {
                      setError("");
                      try {
                        await purchaseSubscription(plan.id);
                        setNotice(`${plan.name} activated.`);
                        const refreshed = await fetchSubscription();
                        setSubscription(refreshed);
                      } catch (purchaseError) {
                        setError(purchaseError instanceof Error ? purchaseError.message : "Purchase failed.");
                      }
                    }}
                  >
                    Buy
                  </Button>
                </div>
              ))}
              {subscription.active ? (
                <Button variant="ghost" onClick={() => void cancelSubscription().then(() => void fetchSubscription().then(setSubscription))}>
                  Cancel renewal
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="t-h3 text-charcoal-900">Incoming requests</h2>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/trainer/onboarding?edit=1" variant="secondary" size="sm">
                Edit profile
              </ButtonLink>
            </div>
          </div>

          {grouped.pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center shadow-sm">
              <p className="t-h4 text-charcoal-900">No open requests</p>
              <p className="pt-2 text-body-sm text-muted-600">
                When a customer books one of your offerings, the request appears here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {grouped.pending.map((booking) => (
                <RequestCard
                  key={booking.id}
                  booking={booking}
                  busy={busyId === booking.id}
                  onAccept={() => void answer(booking.id, "accept")}
                  onDecline={() => void answer(booking.id, "decline")}
                  onSessionState={() => {}}
                />
              ))}
            </div>
          )}

          {grouped.upcoming.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {grouped.upcoming.map((booking) => (
                <RequestCard
                  key={booking.id}
                  booking={booking}
                  busy={busyId === booking.id}
                  onAccept={() => {}}
                  onDecline={() => {}}
                  onSessionState={(action) => void updateSession(booking.id, action)}
                  confirmed
                />
              ))}
            </div>
          ) : null}

          {grouped.past.length > 0 ? (
            <details className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer text-body-sm font-semibold text-forest-900">
                Past requests ({grouped.past.length})
              </summary>
              <ul className="flex flex-col divide-y divide-forest-900/8 pt-3">
                {grouped.past.map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-body-sm text-charcoal-900">{booking.serviceName}</span>
                    <span className={`text-body-sm font-semibold ${statusTone(booking.status)}`}>{booking.status}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        {profile ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline text-terracotta-500">Offerings</p>
              <ul className="flex flex-col divide-y divide-forest-900/8">
                {profile.offerings.map((offering) => (
                  <li key={offering.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-body font-semibold text-charcoal-900">
                        {offering.duration_min} min · ₹
                        {(offering.price_paise / 100).toLocaleString("en-IN")}
                        {offering.sessions_in_package > 1 ? ` · ${offering.sessions_in_package} sessions` : ""}
                      </p>
                      <p className="text-body-sm text-muted-600">
                        {offering.format === "online" ? "Online (Zoom)" : "Home visit"} ·{" "}
                        {offering.active ? "live" : "hidden"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="pt-3">
                <ButtonLink href="/trainer/onboarding?step=offerings" variant="secondary" size="sm">
                  Manage offerings
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline text-terracotta-500">Availability</p>
              <ul className="flex flex-col gap-2 pt-3">
                {WEEKDAY_LABELS.map((label, index) => {
                  const ranges = profile.availability.filter((range) => range.weekday === index);
                  if (ranges.length === 0) return null;
                  return (
                    <li key={label} className="flex flex-wrap items-center gap-2 text-body-sm text-charcoal-900">
                      <span className="w-20 font-semibold">{label}</span>
                      {ranges.map((range) => (
                        <span key={`${range.start_time}-${range.end_time}`} className="rounded-sm bg-ivory-50 px-2.5 py-1 text-caption">
                          {range.start_time} – {range.end_time}
                        </span>
                      ))}
                    </li>
                  );
                })}
              </ul>
              <div className="pt-3">
                <ButtonLink href="/trainer/onboarding?step=availability" variant="secondary" size="sm">
                  Manage availability
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : null}

        {openRequests.length > 0 ? (
          <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-5">
            <p className="t-overline text-terracotta-500">General requests (older flow)</p>
            <p className="pt-2 text-body-sm text-muted-600">
              These come from customers who posted an open request instead of choosing a trainer.
            </p>
            <ul className="flex flex-col divide-y divide-forest-900/8 pt-3">
              {openRequests.map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span className="text-body-sm text-charcoal-900">
                    {booking.serviceName} · {booking.days.join(", ")}
                  </span>
                  {booking.status === "Requested" ? (
                    <Button size="sm" onClick={() => void acceptRequest(booking.id).then(() => void refresh())}>
                      Accept
                    </Button>
                  ) : (
                    <span className={`text-body-sm font-semibold ${statusTone(booking.status)}`}>{booking.status}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-body-sm text-error">{error}</p> : null}
        {notice ? <p className="text-body-sm text-success">{notice}</p> : null}

        <p className="t-caption text-muted-600">
          Your public profile lives at{" "}
          {profile ? (
            <Link href={`/trainers/${profile.trainer.slug}`} className="text-forest-900 underline">
              /trainers/{profile.trainer.slug}
            </Link>
          ) : (
            "/trainers/..."
          )}
        </p>
      </Container>
    </section>
  );
}

function StatusTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
      <p className="t-caption text-muted-600">{label}</p>
      <p className="pt-1 text-body-md font-semibold text-forest-900">{value}</p>
      <p className="pt-0.5 text-caption text-muted-600">{hint}</p>
    </div>
  );
}

function RequestCard({
  booking,
  busy,
  onAccept,
  onDecline,
  onSessionState,
  confirmed = false,
}: {
  booking: TrainerBooking;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onSessionState: (action: "start" | "complete" | "noshow") => void;
  confirmed?: boolean;
}) {
  const slotLabel =
    booking.startTime && booking.endTime
      ? `${booking.startTime} – ${booking.endTime} IST`
      : booking.time === "Specific time" && booking.specificTime
        ? booking.specificTime
        : booking.time;
  const days = booking.days.map((day) => day.slice(0, 3)).join(", ");

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="t-h4 text-charcoal-900">{booking.serviceName}</h3>
          <p className="inline-flex items-center gap-1.5 pt-0.5 text-body-sm text-muted-600">
            <MapPinIcon size={15} /> {booking.location}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-body-sm text-charcoal-900">
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon size={15} className="text-muted-600" />
          {days}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon size={15} className="text-muted-600" />
          {slotLabel}
        </span>
        {booking.pricePaise ? (
          <span className="text-body-sm font-semibold text-forest-900">
            ₹{(booking.pricePaise / 100).toLocaleString("en-IN")}
          </span>
        ) : null}
        {booking.format ? (
          <span className="text-body-sm text-muted-600">
            {booking.format === "online" ? "Online (Zoom)" : "Home visit"}
          </span>
        ) : null}
      </div>

      {booking.format === "online" && booking.status === "Confirmed" ? (
        <div className="rounded-lg border border-forest-900/10 bg-ivory-50 p-3">
          {booking.meetingUrl ? (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm font-semibold text-forest-900 underline"
            >
              Join session
            </a>
          ) : (
            <p className="text-body-sm text-muted-600">
              Add your Zoom link for this booking so the customer can join.
            </p>
          )}
        </div>
      ) : null}

      {!confirmed ? (
        <div className="flex flex-wrap gap-2 border-t border-forest-900/8 pt-3">
          <Button onClick={onAccept} disabled={busy}>
            {busy ? "Working..." : "Accept"}
          </Button>
          <Button variant="secondary" onClick={onDecline} disabled={busy}>
            Decline
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-forest-900/8 pt-3">
          {booking.status === "Confirmed" || booking.status === "Rescheduled" || booking.status === "Upcoming" ? (
            <Button variant="secondary" size="sm" onClick={() => void onSessionState("start")} disabled={busy}>
              Start session
            </Button>
          ) : null}
          {booking.status === "In Progress" || booking.status === "Upcoming" ? (
            <Button size="sm" onClick={() => void onSessionState("complete")} disabled={busy}>
              Mark completed
            </Button>
          ) : null}
          {booking.status === "Confirmed" || booking.status === "Rescheduled" || booking.status === "In Progress" || booking.status === "Upcoming" ? (
            <Button variant="ghost" size="sm" onClick={() => void onSessionState("noshow")} disabled={busy}>
              No show
            </Button>
          ) : null}
        </div>
      )}
    </article>
  );
}
