import { getTrainerBySlug } from "@/lib/server/trainers";
import { execute, randomId } from "@/lib/server/db";
import { rateLimited } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const REASONS = [
  "Misleading profile",
  "Pricing seems wrong",
  "Behaviour concern",
  "Not the right person",
  "Something else",
];

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limit = rateLimited(request, 5, 60 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: `Too many reports. Try again in ${limit.retryAfterSeconds}s.` },
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
  const slug = typeof input.slug === "string" ? input.slug : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim().slice(0, 1000) : "";
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";

  if (!slug || !reason || !contact) {
    return Response.json({ error: "Tell us which profile and why you are reporting it." }, { status: 400 });
  }

  const trainer = await getTrainerBySlug(slug);
  if (!trainer) return Response.json({ error: "Trainer not found." }, { status: 404 });

  await execute(
    `INSERT INTO profile_reports (id, trainer_id, reporter_contact, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomId(), trainer.user_id, contact, reason.slice(0, 200), details],
  );
  return Response.json({ ok: true }, { status: 201 });
}

export { REASONS };
