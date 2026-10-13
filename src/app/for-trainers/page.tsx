// ARAMYA for trainers — marketplace positioning and value proposition (Design System §18).
import type { Metadata } from "next";
import { Container, Overline, SectionHeading, ButtonLink } from "@/components/ui";
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  DocumentIcon,
  LocationIcon,
  PaymentIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/Icons";

export const metadata: Metadata = {
  title: "For Trainers",
  description:
    "Join ARAMYA as a trainer: create a profile, set your own prices and availability, get discovered by customers near you or online, and accept or decline the requests that fit.",
};

const TRAINER_NAV = [
  "Profile",
  "Requests",
  "Offerings",
  "Availability",
  "Areas",
  "Subscription",
];

const MARKETPLACE = [
  {
    icon: UserIcon,
    title: "Create your profile",
    body: "Publish your services, experience and the areas you cover. Your profile is how customers find and compare you.",
  },
  {
    icon: PaymentIcon,
    title: "Set your own prices",
    body: "You decide what your sessions are worth — single sessions or packages, in the formats and durations you offer. ARAMYA does not set or add to your prices.",
  },
  {
    icon: CalendarIcon,
    title: "Publish your availability",
    body: "Post the days and times you can actually train. Requests arrive against the availability you published, not hours you cannot work.",
  },
  {
    icon: LocationIcon,
    title: "Get discovered",
    body: "Customers nearby who train at home, or online over Zoom, find you through the trainer search and filters.",
  },
];

const BENEFITS = [
  {
    icon: BellIcon,
    title: "Requests that fit",
    body: "When a customer sends a request, you see the service, format, duration, preferred days and time before you decide.",
  },
  {
    icon: CheckIcon,
    title: "You accept or decline",
    body: "Accept a request when the schedule works for you. Accepted requests become confirmed bookings for the customer.",
  },
  {
    icon: CalendarIcon,
    title: "A clear schedule",
    body: "Set availability once, then manage upcoming sessions, changes and history from one schedule view.",
  },
  {
    icon: DocumentIcon,
    title: "Session records kept",
    body: "Mark sessions completed, request changes openly and keep a clean history of every booking — no tracking spreadsheets needed.",
  },
];

const STEPS = [
  { step: "01", title: "Apply", body: "Share your services, certifications and the areas you cover." },
  { step: "02", title: "Get verified", body: "We complete identity and credential checks before you appear in matching." },
  { step: "03", title: "Publish your offer", body: "Set your own prices, session formats and availability." },
  { step: "04", title: "Receive requests", body: "Requests arrive with service, format, days and time already clear. Accept the ones that fit." },
];

const SUBSCRIPTION_POINTS = [
  "Where ARAMYA enables a listing subscription, it is optional for trainers and configured by admins.",
  "It is separate from your session prices — you still set those yourself.",
  "It never changes what a customer pays you, and it is never charged to customers.",
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
            Build your training business on your own terms
          </h1>
          <p className="t-body-lg text-ivory-50/75">
            ARAMYA is a marketplace for professional trainers. Create a profile,
            set your own prices and availability, get discovered by customers
            near you or online, and accept or decline the requests that fit.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ButtonLink href="/login?redirect=/trainer/onboarding" size="lg" variant="accent">
              Apply as a trainer
            </ButtonLink>
            <ButtonLink
              href="/how-it-works"
              size="lg"
              variant="secondary"
              className="border-ivory-50/30 bg-transparent text-ivory-50 hover:border-ivory-50/60 hover:bg-ivory-50/10"
            >
              See how it works
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Marketplace positioning */}
      <section className="py-14 md:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="The marketplace"
            title="Your profile, your prices, your calendar"
            description="ARAMYA handles discovery, requests and session records. You decide who you train, when, and at what price."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MARKETPLACE.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ivory-50 text-forest-900">
                    <Icon size={22} />
                  </span>
                  <h3 className="t-h4 text-charcoal-900">{item.title}</h3>
                  <p className="t-body-sm text-muted-600">{item.body}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Verification and subscription */}
      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-2 lg:gap-8">
          <SectionHeading
            overline="Before you go live"
            title="Reviewed before you appear in matching"
            description="Every trainer application goes through a verification review of identity and credentials. Trainers who are not verified do not appear in customer matching."
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-forest-900 text-white">
                  <ShieldIcon size={18} />
                </span>
                <div>
                  <p className="text-body-md text-charcoal-900">Verification review</p>
                  <p className="text-body-sm text-muted-600">
                    Identity and credential checks, completed before your profile is listed
                  </p>
                </div>
              </div>
              <p className="rounded-lg bg-ivory-50 p-4 text-body-sm text-muted-600">
                You keep control of what goes public: services, certifications, session
                formats, the areas you cover and the availability you publish.
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-forest-900 text-white">
                  <SettingsIcon size={18} />
                </span>
                <div>
                  <p className="text-body-md text-charcoal-900">Optional listing subscription</p>
                  <p className="text-body-sm text-muted-600">
                    Only when it has been enabled for the marketplace
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {SUBSCRIPTION_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-forest-900/8 text-forest-900">
                      <CheckIcon size={13} strokeWidth={2.4} />
                    </span>
                    <span className="t-body text-charcoal-900">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Trainer workspace */}
      <section className="py-14 md:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            overline="Your workspace"
            title="Everything a trainer needs, in one place"
            description="A simple dashboard built around requests, offerings and availability — never a maze of tabs."
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
                    <p className="text-body-md text-charcoal-900">Trainer request inbox</p>
                    <p className="text-body-sm text-muted-600">
                      Accept or decline requests when they match your schedule
                    </p>
                  </div>
                </div>
                <span className="rounded-pill border border-forest-900/20 bg-ivory-50 px-3 py-1 text-caption font-semibold text-forest-900">
                  Your choice
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-ivory-50 p-4 text-body-sm text-muted-600">
                Customer requests appear here automatically. A trainer can review the service,
                format, duration, preferred days, preferred time and address before accepting.
              </div>
              <div className="mt-4">
                <ButtonLink href="/trainer" variant="secondary" size="md">
                  Open trainer dashboard
                </ButtonLink>
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
            <ButtonLink href="/login?redirect=/trainer/onboarding" size="lg">
              Apply as a trainer
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
