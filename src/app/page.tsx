// ARAMYA homepage — location-based trainer marketplace (Design System §16 order):
// Header · Hero · Location/search · Specializations · How booking works ·
// How ARAMYA works · Why train at home · For trainers · CTA · Footer.
//
// Positioning: ARAMYA is a marketplace, not a fixed-price managed service.
// Trainers publish their own profiles, set their own session prices, own their
// availability and accept or decline each request — customers choose the trainer
// they want to train with, in person or online.

import {
  Button,
  ButtonLink,
  CheckList,
  Container,
  Overline,
  SectionHeading,
} from "@/components/ui";
import { ServiceCard } from "@/components/cards";
import { LogoMark } from "@/components/Logo";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  HomeIcon,
  LocationIcon,
  MapPinIcon,
  PaymentIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
} from "@/components/Icons";
import { HOW_IT_WORKS, SERVICES } from "@/lib/data";

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
          <Overline>Trainer marketplace</Overline>
          <h1 className="t-display-xl max-w-xl text-charcoal-900">
            Find the right trainer to train with —{" "}
            <span className="text-forest-900">at home or online.</span>
          </h1>
          <p className="t-body-lg max-w-lg text-muted-600">
            ARAMYA is a marketplace of independent fitness and wellness
            trainers. Search by area and specialization, compare real profiles
            and the prices each trainer sets, then send a booking request to the
            one you choose.
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <ButtonLink href="/trainers" size="lg">
              Find a trainer
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="secondary">
              Explore services
            </ButtonLink>
          </div>

          {/* Quick facts — qualitative only, no numbers or counts */}
          <dl className="grid max-w-lg grid-cols-2 gap-4 border-t border-forest-900/10 pt-6 sm:grid-cols-3">
            <div>
              <dt className="t-caption text-muted-600">Pricing</dt>
              <dd className="pt-0.5 text-body-md text-forest-900">
                Set by each trainer
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted-600">Format</dt>
              <dd className="pt-0.5 text-body-md text-forest-900">
                At home or online
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted-600">Booking</dt>
              <dd className="pt-0.5 text-body-md text-forest-900">
                Inside trainer availability
              </dd>
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

            {/* floating request-status card */}
            <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-success/10 text-success">
                  <CheckIcon size={16} strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-charcoal-900">
                    Request sent
                  </p>
                  <p className="truncate text-caption text-muted-600">
                    The trainer accepts or declines
                  </p>
                  <p className="truncate text-caption text-muted-600">
                    Service matched to your schedule
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-charcoal-900">
                  <CalendarIcon size={14} className="text-muted-600" />
                  Trainer availability
                </span>
              </div>
            </div>
          </div>

          {/* pricing chip — trainers set their own prices */}
          <div className="absolute -left-3 top-6 hidden rounded-lg border border-forest-900/10 bg-white px-4 py-3 shadow-md sm:block">
            <p className="t-caption text-muted-600">Session pricing</p>
            <p className="text-body-md text-forest-900">Set by each trainer</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ----------------------------------------------------- Location/search band */

function LocationSearchBand() {
  return (
    <section aria-label="Find trainers near you" className="pb-4">
      <div className="rounded-xl border border-forest-900/10 bg-white p-4 shadow-md md:p-5">
        {/* Submits to /trainers with the marketplace location params. */}
        <form
          action="/trainers"
          method="get"
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.7fr)_auto]"
        >
          {/* City */}
          <div className="relative">
            <LocationIcon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-terracotta-500"
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              aria-label="City"
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
          </div>

          {/* Locality */}
          <div className="relative">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600"
            />
            <input
              type="text"
              name="locality"
              placeholder="Locality or area"
              aria-label="Locality or area"
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
          </div>

          {/* PIN */}
          <div className="relative">
            <MapPinIcon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600"
            />
            <input
              type="text"
              name="pin"
              inputMode="numeric"
              placeholder="PIN code"
              aria-label="PIN code"
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
          </div>

          <Button type="submit" size="lg" className="w-full md:w-auto">
            Find trainers
          </Button>
        </form>

        <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-muted-600">
            Enter a city, locality or PIN code to see trainers who travel to you.
          </p>
          <ButtonLink
            href="/trainers?format=online"
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            Browse online trainers
            <ArrowRightIcon size={16} />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Specializations */

function ServicesSection() {
  return (
    <section className="py-16 md:py-24" id="services">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            overline="Specializations"
            title="Browse trainers by what they teach"
            description="Every trainer on ARAMYA is an independent professional. Each profile lists the specializations they teach, the formats they offer and the prices they set — you choose who to send your request to."
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

/* ------------------------------------------------------- How booking works */

function BookingSection() {
  const steps = [
    {
      step: "01",
      title: "Find a trainer",
      body: "Search trainers by city, locality or PIN code, and narrow by specialization, format and availability.",
    },
    {
      step: "02",
      title: "Pick a session",
      body: "Each trainer lists their own session duration, format and price — compare and choose the one that fits.",
    },
    {
      step: "03",
      title: "Send a request",
      body: "Choose the days and start time that suit you from the trainer's open availability.",
    },
    {
      step: "04",
      title: "Trainer accepts",
      body: "The trainer reviews your request and accepts or declines it. Accepted requests become confirmed sessions.",
    },
  ];

  return (
    <section className="bg-sand-100/60 py-16 md:py-24">
      <Container className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            overline="How booking works"
            title="From search to confirmed session, you stay in control"
            description="ARAMYA is a marketplace, not a fixed-price managed service. You pick the trainer, the session and the time — and the trainer decides what they accept."
          />

          <CheckList
            items={[
              "You choose the trainer you want to train with",
              "Trainers publish their own prices and availability",
              "Requests are accepted or declined by the trainer",
            ]}
          />

          <div className="flex items-start gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-forest-900 text-white">
              <PaymentIcon size={18} />
            </span>
            <div>
              <p className="t-h4 text-charcoal-900">
                Payment is arranged directly with your trainer
              </p>
              <p className="pt-1 text-body-sm text-muted-600">
                ARAMYA connects you with the trainer. Session fees, formats and
                any pack of sessions are agreed between you and them — never a
                plan you have to buy up front.
              </p>
            </div>
          </div>
        </div>

        <ol className="flex flex-col gap-4">
          {steps.map((step) => (
            <li
              key={step.step}
              className="flex gap-4 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm sm:gap-5 sm:p-6"
            >
              <span className="text-caption font-extrabold tracking-[0.14em] text-terracotta-500">
                {step.step}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="t-h4 text-charcoal-900">{step.title}</h3>
                <p className="text-body-sm text-muted-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* --------------------------------------------------------- How it works */

function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          overline="How ARAMYA works"
          title="From request to first session in four steps"
          align="center"
          description="Tell ARAMYA the area, the specialization and the time that suit you — then choose from the trainers who fit and send your request."
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

/* -------------------------------------------------------- Why train at home */

function WhyAtHomeSection() {
  const reasons = [
    {
      icon: HomeIcon,
      title: "At home or online",
      body: "Browse trainers who travel to you, or trainers who teach over video. Each profile shows the formats the trainer offers.",
    },
    {
      icon: ShieldIcon,
      title: "Private and one-to-one",
      body: "Every session is a private session with a single professional trainer — nothing is a generic class replay.",
    },
    {
      icon: UserIcon,
      title: "Real trainer profiles",
      body: "Specializations, experience, the areas a trainer serves and the sessions they publish — listed by the trainer themselves.",
    },
    {
      icon: StarIcon,
      title: "You choose your trainer",
      body: "Compare profiles and send your request to the trainer you want. They accept or decline it, so nothing is booked silently.",
    },
  ];

  return (
    <section className="bg-forest-950 py-16 text-ivory-50 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          overline="Why train with ARAMYA"
          title="A marketplace of real trainers, private sessions on your terms"
          tone="light"
          description="Search by location, compare genuine profiles and choose who trains with you — in person at home or online."
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

/* ------------------------------------------------------------ For trainers */

function ForTrainersSection() {
  const controls = [
    {
      icon: UserIcon,
      title: "Your profile",
      body: "Certifications, experience, the areas you serve and how you teach.",
    },
    {
      icon: PaymentIcon,
      title: "Your pricing",
      body: "You set the price of each session you publish.",
    },
    {
      icon: CalendarIcon,
      title: "Your availability",
      body: "You decide when you work and which requests to accept.",
    },
  ];

  return (
    <section className="py-16 md:py-24" id="for-trainers">
      <Container className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <SectionHeading
          overline="For trainers"
          title="Independent trainers teach on their own terms"
          description="ARAMYA brings you customers nearby who are ready to train. Publish a profile, price your own sessions and accept only the requests that fit your schedule."
        />

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
            <p className="t-overline pb-4 text-terracotta-500">You control</p>
            <ul className="flex flex-col gap-4">
              {controls.map((control) => {
                const Icon = control.icon;
                return (
                  <li key={control.title} className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-forest-900 text-white">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-body-md text-charcoal-900">
                        {control.title}
                      </p>
                      <p className="pt-0.5 text-body-sm text-muted-600">
                        {control.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-6">
            <p className="text-body-sm text-muted-600">
              Listing on ARAMYA is optional and carries a listing fee — session
              payment is arranged directly between you and your customer.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/for-trainers" size="lg">
              Teach on ARAMYA
            </ButtonLink>
            <ButtonLink href="/how-it-works" size="lg" variant="ghost">
              See how matching works
            </ButtonLink>
          </div>
        </div>
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
            <h2 className="t-display text-ivory-50">Find your trainer.</h2>
            <p className="t-body-lg text-ivory-50/75">
              Search by area and specialization, compare real profiles and the
              prices each trainer sets, then send your request to the one you
              want — in person or online.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <ButtonLink
                href="/trainers"
                size="lg"
                variant="accent"
                className="w-full sm:w-auto"
              >
                Find your trainer
              </ButtonLink>
              <ButtonLink
                href="/plans"
                size="lg"
                variant="secondary"
                className="w-full border-ivory-50/30 bg-transparent text-ivory-50 hover:border-ivory-50/60 hover:bg-ivory-50/10 sm:w-auto"
              >
                How pricing works
              </ButtonLink>
            </div>
            <p className="t-caption text-ivory-50/60">
              Trainers set their own prices · In person or online · Payment
              arranged directly with your trainer
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
        <LocationSearchBand />
      </Container>
      <ServicesSection />
      <BookingSection />
      <HowItWorksSection />
      <WhyAtHomeSection />
      <ForTrainersSection />
      <CtaSection />
    </>
  );
}
