// ARAMYA password reset entry point.
import type { Metadata } from "next";
import { Container, Overline } from "@/components/ui";
import { ResetFlow } from "@/components/ResetFlow";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your ARAMYA password with a single-use code.",
};

export default function ForgotPasswordPage() {
  return (
    <section className="py-10 md:py-14">
      <Container className="mx-auto flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Overline>Account recovery</Overline>
          <h1 className="t-h1 text-charcoal-900">Reset your password</h1>
          <p className="t-body text-muted-600">
            Enter your account contact to receive a single-use code (valid 15 minutes),
            then choose a new password.
          </p>
        </div>
        <div className="rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm md:p-8">
          <ResetFlow />
        </div>
      </Container>
    </section>
  );
}
