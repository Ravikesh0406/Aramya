// ARAMYA 404
import { Container, ButtonLink, Overline } from "@/components/ui";
import { SERVICES } from "@/lib/data";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-20 md:py-28">
      <Container className="flex max-w-2xl flex-col gap-6 text-center">
        <Overline className="mx-auto">404</Overline>
        <h1 className="t-display text-charcoal-900">This page moved or never existed</h1>
        <p className="t-body-lg text-muted-600">
          Let&apos;s get you back to training. Try one of the active services or
          start a booking.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink href="/book" size="lg" variant="secondary">
            Book a Trial
          </ButtonLink>
        </div>
        <nav aria-label="Services" className="flex flex-wrap justify-center gap-2 pt-4">
          {SERVICES.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="rounded-pill border border-forest-900/15 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/40"
            >
              {service.name}
            </Link>
          ))}
        </nav>
      </Container>
    </section>
  );
}
