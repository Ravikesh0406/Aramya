// ARAMYA — admin allowlist gate.
//
// The admin console is gated by the ADMIN_CONTACTS environment allowlist
// (comma-separated contact numbers/emails). No new role system is introduced.

import type { UserProfile } from "@/lib/models";

export function adminContacts(): string[] {
  return (process.env.ADMIN_CONTACTS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: UserProfile | null): boolean {
  if (!user) return false;
  const allowlist = adminContacts();
  if (allowlist.length === 0) return false;
  return allowlist.includes(user.contact.toLowerCase()) || allowlist.includes((user.email ?? "").toLowerCase());
}
