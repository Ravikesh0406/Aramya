import type { Metadata } from "next";
import { AdminConsole } from "@/components/AdminConsole";

export const metadata: Metadata = {
  title: "Admin Console",
  description: "Review trainer applications, categories, pricing limits and listing plans.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
