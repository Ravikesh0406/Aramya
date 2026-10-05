// ARAMYA login — customer and trainer entry point.
import type { Metadata } from "next";
import { Container, Overline } from "@/components/ui";
import { LoginForm } from "@/components/LoginForm";
import { LogoMark } from "@/components/Logo";
import { CheckIcon, ShieldIcon, CalendarIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to ARAMYA to manage your sessions, schedule and plan.",
};

const HIGHLIGHTS = [
  { icon: CalendarIcon, text: "Your sessions and schedule in one place" },
  { icon: CheckIcon, text: "Track completed sessions and history" },
  { icon: ShieldIcon, text: "Trainer accounts get a dedicated dashboard" },
];

export default function LoginPage() {
  return (
    <section className="py-10 md:py-14">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Brand panel */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 p-8 text-ivory-50 md:p-12">
          <svg
            aria-hidden
            viewBox="0 0 400 400"
            fill="none"
            className="absolute inset-0 h-full w-full opacity-30"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle cx="200" cy="200" r="140" stroke="#8FA58E" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="100" stroke="#8FA58E" strokeWidth="1.5" />
            <path
              d="M90 290c60-64 160-64 220 0"
              stroke="#B86F52"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative flex flex-col gap-6">
            <LogoMark stroke="#F7F3EA" accent="#B86F52" className="h-12 w-12" />
            <h1 className="t-display max-w-sm text-ivory-50">
              Welcome back to training at home.
            </h1>
            <p className="t-body-lg text-ivory-50/75">
              Sign in to manage your sessions, request schedule changes and keep
              track of your plan.
            </p>
            <ul className="flex flex-col gap-3 pt-2">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.text}
                    className="flex items-center gap-3 text-body-sm text-ivory-50/85"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-ivory-50/15 text-sage-500">
                      <Icon size={14} />
                    </span>
                    {item.text}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Overline>Sign in</Overline>
            <h2 className="t-h1 text-charcoal-900">Login to your account</h2>
            <p className="t-body text-muted-600">
              Customers and trainers both sign in here. Trainers land on their
              dashboard with nearby requests.
            </p>
          </div>
          <LoginForm />
        </div>
      </Container>
    </section>
  );
}
