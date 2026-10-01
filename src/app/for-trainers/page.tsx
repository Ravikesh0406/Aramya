// ARAMYA for trainers — trainer-side navigation and value proposition (Design System §18).
import type { Metadata } from "next";
import { Container, Overline, SectionHeading, ButtonLink } from "@/components/ui";
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  PaymentIcon,
  UserIcon,
} from "@/components/Icons";

export const metadata: Metadata = {
  title: "For Trainers",
  description:
    "Join ARAMYA as a trainer: receive nearby session requests, accept the ones that fit, deliver private at-home sessions and track earnings.",
};

const TRAINER_NAV = [
  "Dashboard",
  "Nearby Requests",
  "Schedule",
  "Sessions",
  "Availability",
  "Earnings",
  "Profile",
];

const BENEFITS = [
  {
    icon: BellIcon,
    title: "Nearby requests",
    body: "When a customer sends a request, nearby eligible trainers are notified with the service, preferred days and time.",
  },
  {
    icon: CheckIcon,
    title: "You choose what fits",
    body: "Accept a request when the schedule works for you. Accepted requests become confirmed bookings for the customer.",
  },
  {
    icon: CalendarIcon,
    title: "A clear schedule",
    body: "Set availability once, then manage upcoming sessions, changes and history from one schedule view.",
  },
  {
    icon: PaymentIcon,
    title: "Tracked earnings",
    body: "Completed sessions are recorded and reflected in your earnings — no tracking spreadsheets needed.",
  },
];

const STEPS = [
  { step: "01", title: "Apply", body: "Share your services, certifications and the areas you cover." },
  { step: "02", title: "Get verified", body: "We complete identity and credential checks before you appear in matching." },
  { step: "03", title: "Receive requests", body: "Nearby requests arrive with service, days and time already clear." },
  { step: "04", title: "Train and track", body: "Deliver sessions, mark them completed and watch earnings build." },
];

export default function ForTrainersPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-forest-900/10 bg-forest-950 py-16 text-ivory-50 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-forest-800/40 blur-3xl"
        />
        <Container className="relative flex max-w-3xl flex-col gap-6">
          <Overline className="text-sage-500">For trainers</Overline>
          <h1 className="t-display text-ivory-50">
            Teach at home — on a schedule that works for you
          </h1>
          <p className="t-body-lg text-ivory-50/75">
            ARAMYA brings you customers nearby who are ready to train. You set
            availability, accept the requests that fit, and deliver private
            at-home sessions while we handle matching, scheduling and records.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ButtonLink href="/login" size="lg" variant="accent">
              Apply as a Trainer
            </ButtonLink>
            <ButtonLink
              href="/how-it-works"
              size="lg"
              variant="secondary"
              className="border-ivory-50/30 bg-transparent text-ivory-50 hover:border-ivory-50/60 hover:bg-ivory-50/10"
            >
              See how matching works
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Trainer workspace */}
      <section className="py-14 md:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            overline="Your workspace"
            title="Everything a trainer needs, in one place"
            description="A simple dashboard built around requests, schedule and sessions — never a maze of tabs."
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2.5">
              {TRAINER_NAV.map((item) => (
                <span
                  key={item}
                  className="rounded-pill border border-forest-900/15 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-forest-900 text-white">
                    <UserIcon size={18} />
                  </span>
                  <div>
                    <p className="text-body-md text-charcoal-900">Nearby request</p>
                    <p className="text-body-sm text-muted-600">
                      Yoga · 0.8 km away
                    </p>
                  </div>
                </div>
                <span className="rounded-pill border border-forest-900/20 bg-ivory-50 px-3 py-1 text-caption font-semibold text-forest-900">
                  Requested
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-forest-900/8 pt-4 sm:grid-cols-4">
                {["Mon", "Wed", "Fri", "Sun"].map((day) => (
                  <span
                    key={day}
                    className="rounded-sm bg-ivory-50 px-3 py-2 text-center text-caption font-semibold text-charcoal-900"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1 text-caption font-semibold text-success">
                  <ClockIcon size={13} /> Morning
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-ivory-50 px-3 py-1 text-caption font-semibold text-charcoal-900">
                  4-Session Trial
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Benefits */}
      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="Why trainers stay"
            title="Predictable requests, honest scheduling"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ivory-50 text-forest-900">
                    <Icon size={22} />
                  </span>
                  <h3 className="t-h4 text-charcoal-900">{benefit.title}</h3>
                  <p className="t-body-sm text-muted-600">{benefit.body}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Steps */}
      <section className="py-14 md:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading overline="Getting started" title="Four steps to your first session" />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="flex flex-col gap-2 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
              >
                <span className="text-caption font-extrabold tracking-[0.14em] text-terracotta-500">
                  {item.step}
                </span>
                <h3 className="t-h4 text-charcoal-900">{item.title}</h3>
                <p className="t-body-sm text-muted-600">{item.body}</p>
              </li>
            ))}
          </ol>
          <div className="flex justify-center pt-2">
            <ButtonLink href="/login" size="lg">
              Apply as a Trainer
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
