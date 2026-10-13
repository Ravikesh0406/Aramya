// ARAMYA pricing principles — trainers set their own prices (Design System §14).
import type { Metadata } from "next";
import { Container, Overline, SectionHeading, ButtonLink, CheckList } from "@/components/ui";
import {
  CalendarIcon,
  ClockIcon,
  EditIcon,
  HomeIcon,
  PaymentIcon,
  PlusIcon,
  ShieldIcon,
  TrainerIcon,
} from "@/components/Icons";

export const metadata: Metadata = {
  title: "How Pricing Works",
  description:
    "ARAMYA is a marketplace: trainers set their own prices, ARAMYA adds nothing on top, and payment for sessions is arranged directly between you and the trainer.",
};

const PRINCIPLES = [
  {
    icon: TrainerIcon,
    title: "Trainers set their own prices",
    body: "Each trainer decides what their sessions are worth — by service, duration, format and the area they cover. Two trainers with the same specialty can price differently, and that is intended.",
  },
  {
    icon: EditIcon,
    title: "ARAMYA adds nothing on top",
    body: "We do not add a markup, a commission or a service fee to a trainer's price. What you agree with the trainer is what you pay.",
  },
  {
    icon: ShieldIcon,
    title: "Sanity bounds only",
    body: "Prices stay within sanity bounds that protect customers and trainers from typos and misuse. Those bounds are configured in the product, not published as copy, and they exist to keep listings reasonable.",
  },
  {
    icon: PaymentIcon,
    title: "Payment is arranged directly",
    body: "Payment for a session is arranged between you and the trainer — not through ARAMYA, and not added to by ARAMYA.",
  },
];

const FORMATS = [
  {
    icon: CalendarIcon,
    title: "Single session",
    body: "Start with one session to see whether a trainer is right for your goal, your schedule and your space.",
  },
  {
    icon: PlusIcon,
    title: "Multi-session package",
    body: "Trainers can also offer packages of several sessions, priced as one package by the trainer. Compare the per-session value before you request.",
  },
  {
    icon: ClockIcon,
    title: "15 to 180 minutes",
    body: "Session length ranges from 15 minutes to 180 minutes. Each trainer lists the lengths they actually offer.",
  },
  {
    icon: HomeIcon,
    title: "In person or online",
    body: "Sessions happen in person as a home visit, or online over Zoom. Every trainer profile shows the formats they offer — some offer both.",
  },
];

const PAYMENT_POINTS = [
  "Payment for a session is arranged directly between the customer and the trainer.",
  "ARAMYA does not collect it, hold it, or add anything to it.",
  "Agree the amount, the format and the schedule before the session is confirmed.",
  "A session only becomes a confirmed booking once the trainer accepts the request.",
];

const FAQ = [
  {
    q: "Who sets the price?",
    a: "The trainer does. Each trainer prices their own services, durations and packages. ARAMYA neither sets those prices nor adds to them — you always see the trainer's own price.",
  },
  {
    q: "How do I pay?",
    a: "Payment for sessions is arranged directly with the customer and the trainer — you agree it with the trainer as part of the request. ARAMYA is not the payment processor for your sessions and does not take a cut of what you pay.",
  },
  {
    q: "Can I book online?",
    a: "Yes. Some trainers work in person as home visits, some online over Zoom, and some offer both. The formats a trainer offers are shown on their profile, and you choose the one you want.",
  },
  {
    q: "What if a trainer declines?",
    a: "Then your request isn't confirmed — and you can send the same request to another trainer. Nothing is charged or locked in by a decline, because payment is arranged between you and the trainer you actually train with.",
  },
  {
    q: "Is there a subscription for trainers?",
    a: "ARAMYA can offer trainers an optional listing subscription where that has been enabled for the marketplace. It is always optional and separate from training itself, and it never changes what you pay a trainer for your sessions.",
  },
];

export default function PlansPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-forest-900/10 bg-ivory-50 py-14 md:py-20">
        <Container className="flex flex-col gap-5">
          <Overline>Pricing</Overline>
          <h1 className="t-display max-w-3xl text-charcoal-900">How pricing works</h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            ARAMYA is a marketplace, not a pricing plan. Trainers set their own
            prices, ARAMYA does not add anything on top, and payment for sessions
            is arranged directly with the customer and the trainer.
          </p>
        </Container>
      </section>

      {/* Principles */}
      <section className="py-14 md:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="How pricing works"
            title="The price is set by the person delivering the session"
            description="There are no fixed ARAMYA prices, no packages we sell, and no commissions added to what you pay a trainer."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => {
              const Icon = principle.icon;
              return (
                <article
                  key={principle.title}
                  className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ivory-50 text-forest-900">
                    <Icon size={22} />
                  </span>
                  <h3 className="t-h4 text-charcoal-900">{principle.title}</h3>
                  <p className="t-body-sm text-muted-600">{principle.body}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Session formats */}
      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            overline="Session formats"
            title="One session, a package, at home or online"
            description="What a session looks like is part of the trainer's listing — compare formats the same way you compare trainers."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((format) => {
              const Icon = format.icon;
              return (
                <article
                  key={format.title}
                  className="flex flex-col gap-3 rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ivory-50 text-forest-900">
                    <Icon size={22} />
                  </span>
                  <h3 className="t-h4 text-charcoal-900">{format.title}</h3>
                  <p className="t-body-sm text-muted-600">{format.body}</p>
                </article>
              );
            })}
          </div>
          <p className="t-caption text-muted-600">
            Sessions must be booked 24 hours in advance or more. Confirmed
            sessions never change silently — a change is requested, accepted by
            the other party, and then rescheduled.
          </p>
        </Container>
      </section>

      {/* Payment */}
      <section className="bg-forest-950 py-14 text-ivory-50 md:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeading
              overline="Payment"
              title="Payment is arranged directly"
              tone="light"
              description="ARAMYA connects you with a trainer and runs the booking, scheduling and session records. The money for the session itself moves between you and the trainer."
            />
          </div>

          <div className="rounded-xl border border-ivory-50/15 bg-forest-900/60 p-6">
            <p className="t-overline pb-5 text-sage-500">How it works</p>
            <CheckList items={PAYMENT_POINTS} tone="light" />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading overline="FAQ" title="Common questions about pricing" />
          <div className="grid gap-4 md:grid-cols-2">
            {FAQ.map((item) => (
              <article
                key={item.q}
                className="rounded-xl border border-forest-900/8 bg-white p-6 shadow-sm"
              >
                <h3 className="t-h4 text-charcoal-900">{item.q}</h3>
                <p className="pt-2 text-body-sm text-muted-600">{item.a}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-forest-900/10 bg-ivory-50 py-14 md:py-20">
        <Container className="flex flex-col items-center gap-6 text-center">
          <SectionHeading
            overline="Next"
            title="Find a trainer who fits your goal and your budget"
            align="center"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/trainers" size="lg">
              Find a trainer
            </ButtonLink>
            <ButtonLink href="/for-trainers" size="lg" variant="secondary">
              For trainers
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
