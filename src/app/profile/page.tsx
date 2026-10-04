import type { Metadata } from "next";
import { ProfilePage } from "@/components/ProfilePage";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your ARAMYA account profile and role.",
};

export default function ProfileRoute() {
  return <ProfilePage />;
}
