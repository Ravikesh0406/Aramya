import type { Metadata } from "next";
import { Suspense } from "react";
import { TrainerOnboarding } from "@/components/TrainerOnboarding";

export const metadata: Metadata = {
  title: "Trainer Onboarding",
  description: "Set up your trainer profile, services, prices, availability and areas.",
};

export const dynamic = "force-dynamic";

export default function TrainerOnboardingPage() {
  return (
    <Suspense fallback={<p className="text-body text-muted-600">Loading onboarding...</p>}>
      <TrainerOnboarding />
    </Suspense>
  );
}
