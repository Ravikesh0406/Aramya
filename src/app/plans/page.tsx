// ARAMYA plans — Design System §10 (Trial) and §14 (Monthly subscription).
import type { Metadata } from "next";
import { Container, Overline, SectionHeading, ButtonLink, CheckList } from "@/components/ui";
import { PlanCard, TrialCard } from "@/components/cards";
import { MONTHLY_PLAN, TRIAL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description:
    "4-Session Trial at ₹999 (regular ₹1,499) and an ongoing Monthly Plan at ₹4,500 / month for private at-home training.",
};

const FAQ = [
  {
    q: "What is the 4-Session Trial?",
    a: "Four private at-home sessions with a matched trainer. You choose your preferred days and a morning, afternoon, evening or specific time. Sessions must be booked 24 hours in advance or more.",
  },
  {
    q: "How much does the Monthly Plan cost?",
    a: "₹4,500 / month. It includes 16 private at-home sessions, your preferred schedule, flexible schedule changes, session tracking and ongoing progress support.",
  },
  {
    q: "Can I change my schedule later?",
    a: "Yes. Both customers and trainers can request changes. A confirmed session moves through Reschedule Requested, the other party accepts, and then it becomes Rescheduled — confirmed sessions never change silently.",
  },
  {
    q: "Is the trial a recurring charge?",
    a: "No. The trial is a one-time 4-Session Trial. If you want regular training afterwards, the Monthly Plan is the ongoing option.",
  },
];

export default function PlansPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-forest-900/10 bg-ivory-50 py-14 md:py-20">
        <Container className="flex flex-col gap-5">
          <Overline>Plans</Overline>
          <h1 className="t-display max-w-3xl text-charcoal-900">
            Simple pricing for at-home training
          </h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            Start with the 4-Session Trial, then continue with the Monthly Plan
            when you want a regular schedule.
          </p>
        </Container>
      </section>

      {/* Cards */}
      <section className="py-14 md:py-20">
        <Container className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
          <TrialCard />
          <PlanCard />
        </Container>
      </section>

      {/* Pricing emphasis — monthly is the primary message */}
      <section className="bg-forest-950 py-14 text-ivory-50 md:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeading
              overline="Monthly Plan"
              title="Ongoing training, one clear price"
              tone="light"
              description="For customers who want regular at-home sessions with a preferred schedule and progress tracked over time."
            />
            <div className="flex items-baseline gap-3">
              <span className="t-display-xl text-ivory-50">₹4,500</span>
              <span className="t-body-lg text-ivory-50/75">/ month</span>
            </div>
            <ButtonLink href="/book" size="lg" variant="accent">
              Start with a Trial
            </ButtonLink>
            <p className="t-caption text-ivory-50/60">
              Most customers begin with the 4-Session Trial before moving to the
              Monthly Plan.
            </p>
          </div>

          <div className="rounded-xl border border-ivory-50/15 bg-forest-900/60 p-6">
            <p className="t-overline pb-5 text-sage-500">What&apos;s included</p>
            <CheckList items={MONTHLY_PLAN.included} tone="light" />
            <p className="t-caption border-t border-ivory-50/15 pt-5 text-ivory-50/60">
              {MONTHLY_PLAN.note}
            </p>
          </div>
        </Container>
      </section>

      {/* Comparison */}
      <section className="py-14 md:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading
            overline="Compare"
            title="Trial and Monthly Plan side by side"
          />
          <div className="overflow-x-auto rounded-xl border border-forest-900/10 bg-white shadow-sm">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-forest-900/10 bg-ivory-50">
                  <th scope="col" className="px-5 py-4 text-body-md text-charcoal-900">
                    {" "}
                  </th>
                  <th scope="col" className="px-5 py-4 text-body-md text-charcoal-900">
                    {TRIAL.name}
                  </th>
                  <th scope="col" className="px-5 py-4 text-body-md text-charcoal-900">
                    {MONTHLY_PLAN.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-900/8">
                {[
                  ["Price", `${TRIAL.price} (regular ${TRIAL.regularPrice})`, `${MONTHLY_PLAN.price} / ${MONTHLY_PLAN.period}`],
                  ["Private at-home sessions", "4 sessions", "16 private at-home sessions"],
                  ["Schedule", "Choose preferred days", "Preferred schedule"],
                  ["Schedule changes", "Flexible", "Flexible schedule changes"],
                  ["Progress support", "Session history", "Session tracking + ongoing progress support"],
                ].map(([label, trial, monthly]) => (
                  <tr key={label}>
                    <th scope="row" className="px-5 py-4 text-body-sm font-semibold text-muted-600">
                      {label}
                    </th>
                    <td className="px-5 py-4 text-body-sm text-charcoal-900">{trial}</td>
                    <td className="px-5 py-4 text-body-sm text-charcoal-900">{monthly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading overline="FAQ" title="Common questions" />
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
          <div className="flex justify-center pt-2">
            <ButtonLink href="/book" size="lg">
              Book Your Trial
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
