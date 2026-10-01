// ARAMYA services overview — all four active services (Design System §8).
import type { Metadata } from "next";
import { Container, SectionHeading, ButtonLink, Overline } from "@/components/ui";
import { ServiceCard, TrialCard } from "@/components/cards";
import { SERVICES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Private at-home yoga, fitness and personal training, mobility and weight management sessions with matched professional trainers.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-forest-900/10 bg-ivory-50 py-14 md:py-20">
        <Container className="flex flex-col gap-5">
          <Overline>Active services</Overline>
          <h1 className="t-display max-w-3xl text-charcoal-900">
            Professional training, delivered to your home
          </h1>
          <p className="t-body-lg max-w-2xl text-muted-600">
            Four active services, each delivered as private at-home sessions
            with a matched trainer. Every service starts with the 4-Session
            Trial.
          </p>
        </Container>
      </section>

      <section className="py-14 md:py-20">
        <Container className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </Container>
      </section>

      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeading
              overline="Every service starts here"
              title="One trial, four sessions, your choice of service"
              description="The 4-Session Trial runs across all four services — pick the one that fits your goal, choose your preferred days and times, and we match you with a nearby trainer."
            />
            <ul className="flex flex-col gap-3">
              {[
                "Private at-home sessions",
                "Choose preferred days and time",
                "Morning, afternoon, evening or specific time",
                "Flexible schedule changes",
                "Sessions booked 24+ hours in advance",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-body text-charcoal-900"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-terracotta-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book" size="lg">
                Book Your Trial
              </ButtonLink>
              <ButtonLink href="/how-it-works" size="lg" variant="secondary">
                How matching works
              </ButtonLink>
            </div>
          </div>

          <TrialCard className="w-full" />
        </Container>
      </section>
    </>
  );
}
