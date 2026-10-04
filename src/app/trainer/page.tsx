// ARAMYA trainer dashboard — local request inbox.
import type { Metadata } from "next";
import { TrainerDashboard } from "@/components/TrainerDashboard";

export const metadata: Metadata = {
  title: "Trainer Dashboard",
  description: "Review nearby customer requests, accept bookings and track accepted sessions.",
};

export default function TrainerPage() {
  return <TrainerDashboard />;
}
