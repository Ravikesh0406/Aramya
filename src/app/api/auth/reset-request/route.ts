// POST /api/auth/reset-request — issue a single-use reset code.
// Always 200-shaped (no account enumeration): the code is delivered by SMS
// when MSG91 is configured, otherwise logged server-side for local dev.
import { findUserByContactRole, createPasswordResetToken } from "@/lib/server/store";
import type { UserRole } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { contact, role } = body as { contact?: string; role?: string };
  const cleanContact = typeof contact === "string" ? contact.trim() : "";
  const cleanRole: UserRole = role === "trainer" ? "trainer" : "customer";
  if (!cleanContact) {
    return Response.json({ error: "Contact details are required." }, { status: 400 });
  }

  const user = await findUserByContactRole(cleanContact, cleanRole);
  if (user) {
    const { token } = await createPasswordResetToken(user.id);
    const templateId = process.env.MSG91_RESET_TEMPLATE_ID;
    if (process.env.MSG91_AUTH_KEY && templateId && /^\+?\d[\d\s-]{7,14}$/.test(cleanContact)) {
      try {
        await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: { authkey: process.env.MSG91_AUTH_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            template_id: templateId,
            sender: process.env.MSG91_SENDER_ID ?? "ARAMYA",
            short_url: "0",
            mobiles: cleanContact.replace(/[^\d]/g, ""),
            VAR1: token,
          }),
        });
      } catch (err) {
        console.log(`[reset-sms:error] ${err instanceof Error ? err.message : err}`);
      }
    } else {
      // Dev fallback — never log tokens in production without a sender.
      console.log(`[reset-code:dev-only] ${cleanContact} → ${token}`);
    }
  }
  // Same response either way: no account enumeration.
  return Response.json({ ok: true, message: "If an account exists, a reset code is on its way." });
}
