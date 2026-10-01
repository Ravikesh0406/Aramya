// ARAMYA customer area — Home, Services, My Sessions, Schedule, Plan, Profile (Design System §18).
import type { Metadata } from "next";
import Link from "next/link";
import { Container, Overline, ButtonLink, StatusBadge } from "@/components/ui";
import { SessionCard, PlanCard } from "@/components/cards";
import { DEMO_SESSIONS, MONTHLY_PLAN, TRIAL } from "@/lib/data";
import { CalendarIcon, ClockIcon, CheckIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "My Sessions",
  description: "Your ARAMYA sessions, schedule and plan at a glance.",
};

const NAV = [
  { label: "Home", href: "/sessions", active: true },
  { label: "Services", href: "/services" },
  { label: "My Sessions", href: "/sessions" },
  { label: "Schedule", href: "/sessions" },
  { label: "Plan", href: "/plans" },
  { label: "Profile", href: "/login" },
];

export default function SessionsPage() {
  const upcoming = DEMO_SESSIONS.filter(
    (session) => session.status === "Confirmed" || session.status === "Upcoming",
  );
  const history = DEMO_SESSIONS.filter(
    (session) => session.status !== "Confirmed" && session.status !== "Upcoming",
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
                Your sessions, schedule and plan — all in one place.
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
            {/* Summary tiles */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: "4", label: "Sessions in trial" },
                { value: "2", label: "Upcoming" },
                { value: "₹999", label: "Trial price" },
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

            {/* Upcoming */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="t-h3 text-charcoal-900">Upcoming sessions</h2>
                <span className="rounded-pill bg-forest-900/8 px-3 py-1 text-caption font-semibold text-forest-900">
                  {upcoming.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((session) => (
                  <SessionCard key={session.date} {...session} />
                ))}
              </div>
            </div>

            {/* History */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="t-h3 text-charcoal-900">Session history</h2>
                <span className="rounded-pill bg-forest-900/8 px-3 py-1 text-caption font-semibold text-forest-900">
                  {history.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {history.map((session) => (
                  <SessionCard key={session.date} {...session} />
                ))}
              </div>
            </div>

            {/* Schedule rules */}
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

          {/* Plan sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline pb-4 text-muted-600">Current booking</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="t-h4 text-charcoal-900">{TRIAL.name}</p>
                  <p className="pt-0.5 text-body-sm text-muted-600">
                    Fitness / Personal Training
                  </p>
                </div>
                <StatusBadge status="Confirmed" />
              </div>
              <div className="mt-4 flex items-baseline gap-2 border-t border-forest-900/8 pt-4">
                <span className="text-body-sm text-muted-600 line-through">
                  {TRIAL.regularPrice}
                </span>
                <span className="t-h2 text-forest-900">{TRIAL.price}</span>
              </div>
            </div>

            <PlanCard />

            <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-6">
              <p className="t-h4 text-charcoal-900">Continue training</p>
              <p className="pt-1.5 text-body-sm text-muted-600">
                The {MONTHLY_PLAN.name} keeps your preferred schedule going at{" "}
                {MONTHLY_PLAN.price} / {MONTHLY_PLAN.period}.
              </p>
              <div className="pt-4">
                <ButtonLink href="/plans" variant="secondary" className="w-full">
                  View plans
                </ButtonLink>
              </div>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
