// ARAMYA service detail — Design System §8 (services) and §9 (What's included).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Overline, ButtonLink, CheckList, SectionHeading } from "@/components/ui";
import { ServiceCard, TrialCard } from "@/components/cards";
import { SERVICE_ICONS } from "@/components/Icons";
import { SERVICES, getService, HOW_IT_WORKS, TRIAL } from "@/lib/data";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata(
  props: PageProps<"/services/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const service = getService(slug);
  if (!service) return { title: "Service not found" };
  return {
    title: service.name,
    description: `${service.short} ${service.description.slice(0, 120)}...`,
  };
}

export default async function ServiceDetailPage(
  props: PageProps<"/services/[slug]">,
) {
  const { slug } = await props.params;
  const service = getService(slug);
  if (!service) notFound();

  const Icon = SERVICE_ICONS[service.icon];
  const others = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-forest-900/10 bg-ivory-50 py-14 md:py-20">
        <Container className="flex flex-col gap-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm text-muted-600">
            <Link href="/services" className="transition hover:text-forest-900">
              Services
            </Link>
            <span aria-hidden>/</span>
            <span className="text-charcoal-900">{service.name}</span>
          </nav>

          <div className="flex items-start gap-5">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-md bg-forest-900 text-white sm:flex">
              <Icon size={28} />
            </span>
            <div className="flex flex-col gap-4">
              <Overline>Active service</Overline>
              <h1 className="t-display text-charcoal-900">{service.name}</h1>
              <p className="t-body-lg max-w-2xl text-muted-600">
                {service.short}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ButtonLink href={`/book?service=${service.slug}`} size="lg">
              Book Your Trial
            </ButtonLink>
            <ButtonLink href="#included" size="lg" variant="secondary">
              What&apos;s included
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Description + included */}
      <section className="py-14 md:py-20" id="included">
        <Container className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeading
              overline="About this service"
              title="Private, goal-oriented sessions at home"
              description={service.description}
            />
            <div className="flex flex-col gap-4 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline text-muted-600">Focus areas</p>
              <ul className="flex flex-col gap-3">
                {service.focus.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-body text-charcoal-900"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-pill bg-terracotta-500"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="t-caption border-t border-forest-900/8 pt-4 text-muted-600">
                Guidance is provided within your trainer&apos;s professional
                qualifications. ARAMYA does not offer medical treatment or
                clinical advice.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-md">
            <p className="t-overline pb-5 text-terracotta-500">
              What&apos;s included
            </p>
            <CheckList items={service.included} />
            <div className="mt-6 border-t border-forest-900/8 pt-5">
              <ButtonLink href={`/book?service=${service.slug}`} size="lg" className="w-full">
                Book the 4-Session Trial
              </ButtonLink>
              <p className="t-caption pt-3 text-center text-muted-600">
                {TRIAL.price} (regular {TRIAL.regularPrice}) · 24+ hours advance booking
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* How it works strip */}
      <section className="bg-sand-100/60 py-14 md:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading
            overline="The same simple flow"
            title="How a booking moves from request to session"
          />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <li
                key={step.step}
                className="flex flex-col gap-2 rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm"
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
            <ButtonLink href="/how-it-works" variant="ghost">
              Read the full process
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Other services */}
      <section className="py-14 md:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading overline="Explore more" title="Other active services" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <ServiceCard key={other.slug} service={other} />
            ))}
          </div>
          <div className="flex justify-center">
            <TrialCard className="w-full max-w-md" />
          </div>
        </Container>
      </section>
    </>
  );
}
