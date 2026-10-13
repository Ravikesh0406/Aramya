import { execute, randomId } from "@/lib/server/db";
import { rateLimited } from "@/lib/server/rate-limit";
import { isValidPin } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** "Notify me when you're in my area" — contact + PIN/city, with consent. */
export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limit = rateLimited(request, 3, 60 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";
  const pinCode = typeof input.pinCode === "string" ? input.pinCode.trim() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const consent = input.consent === true;

  if (!contact || !isValidPin(pinCode)) {
    return Response.json({ error: "A contact and a valid 6-digit PIN code are required." }, { status: 400 });
  }
  if (!consent) {
    return Response.json(
      { error: "Please confirm we may contact you about trainers in your area." },
      { status: 400 },
    );
  }

  try {
    await execute(
      `INSERT INTO area_interest (id, contact, pin_code, city) VALUES ($1, $2, $3, $4)
       ON CONFLICT (contact, pin_code) DO NOTHING`,
      [randomId(), contact, pinCode, city],
    );
  } catch {
    // Unique conflict already means the interest is recorded.
  }
  return Response.json({ ok: true }, { status: 201 });
}
