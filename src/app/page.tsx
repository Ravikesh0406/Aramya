// ARAMYA homepage — Design System §16 structure:
// Header · Hero · Location/search · Services · 4-Session Trial · How ARAMYA Works ·
// Why train at home · Trainer trust · Monthly Plan · CTA · Footer

import { Container, Overline, SectionHeading, ButtonLink } from "@/components/ui";
import { LocationSearchBar } from "@/components/LocationSearchBar";
import { PlanCard, ServiceCard, TrialCard } from "@/components/cards";
import { LogoMark } from "@/components/Logo";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  HomeIcon,
  ShieldIcon,
  StarIcon,
  CalendarIcon,
} from "@/components/Icons";
import { HOW_IT_WORKS, SERVICES, TRIAL, MONTHLY_PLAN } from "@/lib/data";

/* ------------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ivory-50">
      {/* soft brand shapes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full bg-sand-100/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-forest-900/5 blur-3xl"
      />

      <Container className="relative grid items-center gap-12 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Copy */}
        <div className="flex flex-col gap-6">
          <Overline>Managed at-home training</Overline>
          <h1 className="t-display-xl max-w-xl text-charcoal-900">
            Fitness &amp; wellness,{" "}
            <span className="text-forest-900">at home.</span>
          </h1>
          <p className="t-body-lg max-w-lg text-muted-600">
            ARAMYA matches you with professional trainers who come to your home
            for private, goal-oriented sessions — yoga, personal training,
            mobility and weight management, on your schedule.
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <ButtonLink href="/book" size="lg">
              Book a Trial
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="secondary">
              Explore Services
            </ButtonLink>
          </div>

          {/* Quick facts */}
          <dl className="grid max-w-lg grid-cols-2 gap-4 border-t border-forest-900/10 pt-6 sm:grid-cols-3">
            <div>
              <dt className="t-caption text-muted-600">4-Session Trial</dt>
              <dd className="pt-0.5 text-body-md text-forest-900">
                {TRIAL.price}{" "}
                <span className="text-body-sm font-normal text-muted-600 line-through">
                  {TRIAL.regularPrice}
                </span>
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted-600">Active services</dt>
              <dd className="pt-0.5 text-body-md text-forest-900">4 ways to train</dd>
            </div>
            <div>
              <dt className="t-caption text-muted-600">Advance booking</dt>
              <dd className="pt-0.5 text-body-md text-forest-900">24+ hours</dd>
            </div>
          </dl>
        </div>

        {/* Visual */}
        <div className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 shadow-lg sm:aspect-[5/4] lg:aspect-[4/5]">
            {/* abstract movement lines */}
            <svg
              aria-hidden
              viewBox="0 0 400 500"
              fill="none"
              className="absolute inset-0 h-full w-full opacity-40"
              preserveAspectRatio="xMidYMid slice"
            >
              <circle cx="200" cy="210" r="130" stroke="#8FA58E" strokeWidth="1.5" />
              <circle cx="200" cy="210" r="92" stroke="#8FA58E" strokeWidth="1.5" />
              <path
                d="M70 330c60-70 200-70 260 0"
                stroke="#B86F52"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M110 360c45-46 135-46 180 0"
                stroke="#F7F3EA"
                strokeOpacity="0.5"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-pill bg-forest-950/70 px-3.5 py-1.5 text-caption font-semibold text-ivory-50 backdrop-blur">
              <ShieldIcon size={14} className="text-sage-500" />
              Identity-verified trainers
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ivory-50">
              <LogoMark stroke="#F7F3EA" accent="#B86F52" className="h-16 w-16" />
            </div>

            {/* floating confirmed-session card */}
            <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-success/10 text-success">
                  <CheckIcon size={16} strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-charcoal-900">
                    Session confirmed
                  </p>
                  <p className="truncate text-caption text-muted-600">
                    Professional at-home sessions
                  </p>
                  <p className="truncate text-caption text-muted-600">
                    Service matched to your schedule
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-charcoal-900">
                  <CalendarIcon size={14} className="text-muted-600" />
                  24h+ ahead
                </span>
              </div>
            </div>
          </div>

          {/* price chip */}
          <div className="absolute -left-3 top-6 hidden rounded-lg border border-forest-900/10 bg-white px-4 py-3 shadow-md sm:block">
            <p className="t-caption text-muted-600">4-Session Trial</p>
            <p className="text-body-md text-forest-900">
              {TRIAL.price}{" "}
              <span className="text-body-sm font-normal text-muted-600 line-through">
                {TRIAL.regularPrice}
              </span>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* --------------------------------------------------------------- Services */

function ServicesSection() {
  return (
    <section className="py-16 md:py-24" id="services">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            overline="Active services"
            title="Four ways to train at home"
            description="Every session is private, trainer-led and structured around your goals — never a generic class replay."
          />
          <ButtonLink href="/services" variant="secondary" size="md" className="shrink-0">
            All services
          </ButtonLink>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ Trial */

function TrialSection() {
  return (
    <section className="bg-sand-100/60 py-16 md:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            overline="Start with the trial"
            title={
              <>
                Try ARAMYA with the{" "}
                <span className="text-forest-900">4-Session Trial</span>
              </>
            }
            description="Four private at-home sessions to find your rhythm, meet your trainer and see how at-home training fits your week."
          />

          <div className="flex items-baseline gap-3">
            <span className="t-display text-forest-900">{TRIAL.price}</span>
            <span className="t-body-lg text-muted-600 line-through">{TRIAL.regularPrice}</span>
            <span className="rounded-pill bg-forest-900 px-3 py-1 text-caption font-semibold text-white">
              Early access price
            </span>
          </div>

          <ul className="grid gap-3 pt-2 sm:grid-cols-2">
            {[
              "Choose your preferred days",
              "Morning, afternoon or evening",
              "Flexible schedule changes",
              "Professional trainer-led sessions",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-body text-charcoal-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-forest-900 text-white">
                  <CheckIcon size={12} strokeWidth={2.6} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ButtonLink href="/book" size="lg">
              Book Your Trial
            </ButtonLink>
            <ButtonLink href="/plans" size="lg" variant="ghost">
              See full pricing
            </ButtonLink>
          </div>
          <p className="t-caption text-muted-600">
            Sessions must be booked 24 hours in advance or more.
          </p>
        </div>

        <TrialCard className="mx-auto w-full max-w-md" />
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------- How it works */

function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          overline="How ARAMYA works"
          title="From request to first session in four steps"
          align="center"
          description="A managed service: you tell us what you need and when — we handle matching, confirmation and tracking."
          className="items-center text-center"
        />

        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <li
              key={step.step}
              className="relative flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
            >
              <span className="text-caption font-extrabold tracking-[0.14em] text-terracotta-500">
                {step.step}
              </span>
              <h3 className="t-h4 text-charcoal-900">{step.title}</h3>
              <p className="t-body-sm text-muted-600">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="flex justify-center">
          <ButtonLink href="/how-it-works" variant="secondary">
            See the full flow
            <ArrowRightIcon size={16} />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------- Why train home */

function WhyAtHomeSection() {
  const reasons = [
    {
      icon: HomeIcon,
      title: "No commute, no crowd",
      body: "Your trainer comes to you. Sessions happen in your own space, with your own schedule — no gym travel, no waiting for equipment.",
    },
    {
      icon: ShieldIcon,
      title: "Private and one-to-one",
      body: "Every session is a private session with a single professional trainer. Nothing is a generic class replay.",
    },
    {
      icon: ClockIcon,
      title: "Scheduling that flexes",
      body: "Choose preferred days and morning, afternoon or evening slots. Changes are requested openly — confirmed sessions never change silently.",
    },
    {
      icon: StarIcon,
      title: "Progress you can track",
      body: "Session history, exercise progression and ongoing support keep your training moving in a direction you can see.",
    },
  ];

  return (
    <section className="bg-forest-950 py-16 text-ivory-50 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          overline="Why train at home"
          title="The structure of a managed service, the warmth of training at home"
          tone="light"
          description="Marketplace clarity without the friction: matching, scheduling and session records handled for you."
          className="max-w-3xl"
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                className="flex flex-col gap-4 rounded-xl border border-ivory-50/12 bg-forest-900/60 p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ivory-50/10 text-sage-500">
                  <Icon size={22} />
                </span>
                <h3 className="t-h4 text-ivory-50">{reason.title}</h3>
                <p className="t-body-sm text-ivory-50/70">{reason.body}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------- Trainer trust */

function TrustSection() {
  return (
    <section className="py-16 md:py-24">
      <Container className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <SectionHeading
          overline="Trainer trust"
          title="Trainers matched nearby — and kept consistent"
          description="After you send a request, nearby eligible trainers are notified, one accepts, and your booking is confirmed. Wherever possible, the same trainer stays with your bundle."
        />

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
            <p className="t-overline pb-3 text-terracotta-500">Live requests</p>
            <p className="t-h4 text-charcoal-900">
              Requests are matched from the active trainer dashboard
            </p>
            <p className="pt-2 text-body-sm text-muted-600">
              Customer bookings stay in one shared schedule. Nearby trainers accept the ones
              that fit, and the same accepted request becomes your confirmed booking.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg bg-ivory-50 p-4 text-center">
              <p className="text-body-md text-forest-900">Verified</p>
              <p className="pt-0.5 text-caption text-muted-600">
                Identity checks
              </p>
            </div>
            <div className="rounded-lg bg-ivory-50 p-4 text-center">
              <p className="text-body-md text-forest-900">Tracked</p>
              <p className="pt-0.5 text-caption text-muted-600">Session history</p>
            </div>
            <div className="rounded-lg bg-ivory-50 p-4 text-center">
              <p className="text-body-md text-forest-900">Consistent</p>
              <p className="pt-0.5 text-caption text-muted-600">
                Same trainer
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------ Monthly plan */

function PlanSection() {
  return (
    <section className="bg-sand-100/60 py-16 md:py-24" id="plans">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            overline="Monthly plan"
            title="Train on an ongoing schedule with one monthly plan"
            description="For customers who want regular at-home training with a preferred schedule and ongoing progress support."
          />

          <div className="flex items-baseline gap-3">
            <span className="t-display text-forest-900">{MONTHLY_PLAN.price}</span>
            <span className="t-body-lg text-muted-600">/ month</span>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
            <p className="t-overline text-muted-600">What&apos;s included</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {[
                "16 private at-home sessions",
                "Preferred schedule",
                "Flexible schedule changes",
                "Session tracking",
                "Ongoing progress support",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-body text-charcoal-900"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-forest-900 text-white">
                    <CheckIcon size={12} strokeWidth={2.6} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/book" size="lg">
              Start with a Trial
            </ButtonLink>
            <ButtonLink href="/plans" size="lg" variant="ghost">
              Compare plans
            </ButtonLink>
          </div>
          <p className="t-caption text-muted-600">
            {`Sessions must be booked 24 hours in advance or more.`}
          </p>
        </div>

        <PlanCard className="mx-auto w-full max-w-md" />
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------- CTA */

function CtaSection() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-900 to-forest-950 px-6 py-14 text-center text-ivory-50 shadow-lg md:px-12 md:py-20">
          <svg
            aria-hidden
            viewBox="0 0 800 400"
            fill="none"
            className="absolute inset-0 h-full w-full opacity-30"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle cx="400" cy="200" r="150" stroke="#8FA58E" strokeWidth="1.5" />
            <circle cx="400" cy="200" r="110" stroke="#8FA58E" strokeWidth="1.5" />
            <path d="M180 300c90-80 350-80 440 0" stroke="#B86F52" strokeWidth="2" strokeLinecap="round" />
          </svg>

          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
            <Overline className="text-sage-500">Ready when you are</Overline>
            <h2 className="t-display text-ivory-50">
              Your first four sessions start here.
            </h2>
            <p className="t-body-lg text-ivory-50/75">
              Tell us your location, your service and your preferred days — we&apos;ll
              match you with a nearby trainer and confirm your booking.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <ButtonLink
                href="/book"
                size="lg"
                variant="accent"
                className="w-full sm:w-auto"
              >
                Book a Trial
              </ButtonLink>
              <ButtonLink
                href="/services"
                size="lg"
                variant="secondary"
                className="w-full border-ivory-50/30 bg-transparent text-ivory-50 hover:border-ivory-50/60 hover:bg-ivory-50/10 sm:w-auto"
              >
                Explore Services
              </ButtonLink>
            </div>
            <p className="t-caption text-ivory-50/60">
              4-Session Trial {TRIAL.price} (regular {TRIAL.regularPrice}) · Monthly Plan {MONTHLY_PLAN.price} / month
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ Page */

export default function HomePage() {
  return (
    <>
      <Hero />
      <Container>
        <LocationSearchBar />
      </Container>
      <ServicesSection />
      <TrialSection />
      <HowItWorksSection />
      <WhyAtHomeSection />
      <TrustSection />
      <PlanSection />
      <CtaSection />
    </>
  );
}
