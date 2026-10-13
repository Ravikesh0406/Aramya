import type { Metadata } from "next";
import { TrainerOnboarding } from "@/components/TrainerOnboarding";

export const metadata: Metadata = {
  title: "Trainer Onboarding",
  description: "Set up your trainer profile, services, prices, availability and areas.",
};

export default function TrainerOnboardingPage() {
  return <TrainerOnboarding />;
}
