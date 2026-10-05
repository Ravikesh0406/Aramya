// ARAMYA footer — brand, services, navigation, plan information.
import Link from "next/link";
import { Container } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { SERVICES, TRIAL, MONTHLY_PLAN } from "@/lib/data";

const FOOTER_COLUMNS = [
  {
    title: "Services",
    links: [
      { label: "Yoga", href: "/services/yoga" },
      { label: "Fitness / Personal Training", href: "/services/fitness-personal-training" },
      { label: "Mobility", href: "/services/mobility" },
      { label: "Weight Management", href: "/services/weight-management" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "How it Works", href: "/how-it-works" },
      { label: "Plans", href: "/plans" },
      { label: "For Trainers", href: "/for-trainers" },
      { label: "Login", href: "/login" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Book a Trial", href: "/book" },
      { label: "My Sessions", href: "/sessions" },
      { label: `4-Session Trial — ${TRIAL.price}`, href: "/plans" },
      { label: `Monthly Plan — ${MONTHLY_PLAN.price}/${MONTHLY_PLAN.period}`, href: "/plans" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-forest-950 text-ivory-50">
      <Container className="py-12 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Logo tone="ivory" />
            <p className="t-body-sm max-w-xs text-ivory-50/70">
              Managed marketplace for professional fitness and wellness training
              at home. Yoga, personal training, mobility and weight management —
              matched to nearby, verified trainers.
            </p>
            <p className="t-caption text-ivory-50/55">
              aramya.co · Sessions must be booked 24 hours in advance or more.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="t-overline pb-4 text-sage-500">{column.title}</h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="t-body-sm text-ivory-50/80 transition duration-200 ease-out hover:text-ivory-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-ivory-50/15 pt-6">
          <p className="t-caption text-ivory-50/60">
            © {new Date().getFullYear()} ARAMYA · Active services:{" "}
            {SERVICES.map((service) => service.name).join(", ")} · Guidance is
            provided within each trainer&apos;s professional qualifications and
            does not constitute medical treatment.
          </p>
          <p className="t-caption pt-2 text-ivory-50/45">
            4-Session Trial {TRIAL.price} (regular {TRIAL.regularPrice}) · Monthly Plan{" "}
            {MONTHLY_PLAN.price} / {MONTHLY_PLAN.period}
          </p>
        </div>
      </Container>
    </footer>
  );
}
