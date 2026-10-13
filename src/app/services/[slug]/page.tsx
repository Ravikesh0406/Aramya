// ARAMYA service detail — Design System §8 (services) and §9 (What's included).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Overline, ButtonLink, CheckList, SectionHeading } from "@/components/ui";
import { ServiceCard } from "@/components/cards";
import { SERVICE_ICONS } from "@/components/Icons";
import { TrainerMarketCard } from "@/components/TrainerMarketCard";
import { SERVICES, getService, HOW_IT_WORKS } from "@/lib/data";
import { searchTrainersByCategory } from "@/lib/server/search";
import { listCategories } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

/**
 * Static params come from the legacy SERVICES list so existing URLs keep working;
 * the page itself resolves the category from the database, which also gives the
 * six categories added in the marketplace a working page.
 */
export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata(
  props: PageProps<"/services/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const service = getService(slug);
  if (service) {
    return { title: service.name, description: `${service.short} ${service.description.slice(0, 120)}...` };
  }
  const categories = await listCategories(true);
  const category = categories.find((item) => item.slug === slug);
  if (!category) return { title: "Specialization not found" };
  return { title: category.name, description: category.description };
}

export default async function ServiceDetailPage(
  props: PageProps<"/services/[slug]">,
) {
  const { slug } = await props.params;
  const service = getService(slug);
  const categories = await listCategories(true);
  const category = categories.find((item) => item.slug === slug) ?? null;
  if (!service && !category) notFound();

  const title = service?.name ?? category?.name ?? "Specialization";
  const short = service?.short ?? category?.description ?? "";
  const description = service?.description ?? category?.description ?? "";
  const Icon = service ? SERVICE_ICONS[service.icon] : null;
  const others = SERVICES.filter((s) => s.slug !== slug);

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
            <span className="text-charcoal-900">{title}</span>
          </nav>

          <div className="flex items-start gap-5">
            {Icon ? (
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-md bg-forest-900 text-white sm:flex">
                <Icon size={28} />
              </span>
            ) : null}
            <div className="flex flex-col gap-4">
              <Overline>Specialization</Overline>
              <h1 className="t-display text-charcoal-900">{title}</h1>
              <p className="t-body-lg max-w-2xl text-muted-600">{short}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ButtonLink href={`/trainers?category=${slug}`} size="lg">
              Find a trainer
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
              description={description}
            />
            <div className="flex flex-col gap-4 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
              <p className="t-overline text-muted-600">Focus areas</p>
              <ul className="flex flex-col gap-3">
                {(service?.focus ?? []).map((item) => (
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
            <CheckList items={service?.included ?? []} />
            <div className="mt-6 border-t border-forest-900/8 pt-5">
              <ButtonLink href={`/trainers?category=${slug}`} size="lg" className="w-full">
                Find a trainer
              </ButtonLink>
              <p className="t-caption pt-3 text-center text-muted-600">
                Each trainer sets their own price · sessions booked 24+ hours in advance
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

      {/* Trainers in this specialization */}
      <TrainerList slug={slug} />

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
          </div>
        </Container>
      </section>
    </>
  );
}

/** Trainers currently listed in this specialization (server-rendered). */
async function TrainerList({ slug }: { slug: string }) {
  const trainers = await searchTrainersByCategory(slug, 6);
  return (
    <section className="py-14 md:py-20">
      <Container className="flex flex-col gap-8">
        <SectionHeading
          overline="Trainers"
          title={trainers.length > 0 ? "Trainers available now" : "Trainers in this specialization"}
          description={
            trainers.length > 0
              ? "Compare profiles, prices and availability, then send a booking request."
              : "No trainers are listed here yet. Browse all trainers or try an online session."
          }
        />
        {trainers.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => (
              <TrainerMarketCard key={trainer.slug} trainer={trainer} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/trainers">Find a trainer</ButtonLink>
            <ButtonLink href="/trainers?format=online" variant="secondary">
              Browse online trainers
            </ButtonLink>
          </div>
        )}
      </Container>
    </section>
  );
}
