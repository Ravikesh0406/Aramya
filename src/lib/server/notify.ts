// Trainer SMS alerts (Phase 5B) — MSG91, env-gated.
// Without MSG91_AUTH_KEY + MSG91_TEMPLATE_ID, notifications are logged
// server-side only. Never throws: booking creation must not fail because
// an SMS failed.
import { listUsersByRole } from "@/lib/server/store";
import type { BookingRequest } from "@/lib/models";

function looksLikePhone(contact: string): boolean {
  return /^\+?\d[\d\s-]{7,14}$/.test(contact.trim());
}

export async function notifyTrainersOfBooking(booking: BookingRequest): Promise<{
  attempted: number;
  sent: number;
}> {
  let trainers: { contact: string }[] = [];
  try {
    trainers = await listUsersByRole("trainer");
  } catch {
    return { attempted: 0, sent: 0 };
  }
  const phones = [...new Set(trainers.map((t) => t.contact).filter(looksLikePhone))];
  if (phones.length === 0) return { attempted: 0, sent: 0 };

  const message =
    `Aramya: new ${booking.serviceName} trial request near ${booking.location} ` +
    `(${booking.days.join(", ")}, ${booking.time}). Open your trainer dashboard to accept.`;

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    console.log(`[notify-sms:skipped-no-keys] to ${phones.length} trainer(s): ${message}`);
    return { attempted: phones.length, sent: 0 };
  }

  let sent = 0;
  for (const phone of phones) {
    try {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { authkey: authKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          sender: process.env.MSG91_SENDER_ID ?? "ARAMYA",
          short_url: "0",
          mobiles: phone.replace(/[^\d]/g, ""),
          VAR1: booking.serviceName,
          VAR2: booking.location,
          VAR3: booking.days.join(", "),
        }),
      });
      if (res.ok) sent += 1;
      else console.log(`[notify-sms:failed] ${phone}: ${res.status}`);
    } catch (err) {
      console.log(`[notify-sms:error] ${phone}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { attempted: phones.length, sent };
}
