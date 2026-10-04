// ARAMYA customer area — Home, Services, My Sessions, Schedule, Plan, Profile (Design System §18).
import type { Metadata } from "next";
import { SessionsDashboard } from "@/components/SessionsDashboard";

export const metadata: Metadata = {
  title: "My Sessions",
  description: "Your ARAMYA sessions, schedule and plan at a glance.",
};

export default function SessionsPage() {
  return <SessionsDashboard />;
}
