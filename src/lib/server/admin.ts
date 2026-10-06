// Org admin gate — contact allowlist (ADMIN_CONTACTS, comma-separated).
// Keeps operator tooling off customer/trainer roles without a full RBAC pass.
import type { UserProfile } from "@/lib/models";

export function adminContacts(): string[] {
  return (process.env.ADMIN_CONTACTS ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function isAdmin(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return adminContacts().includes(user.contact);
}
