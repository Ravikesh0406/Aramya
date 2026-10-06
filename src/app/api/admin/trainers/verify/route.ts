// POST /api/admin/trainers/verify — flip a trainer's verification flag.
// Admin allowlist only. Body: { contact, verified }.
import { getCurrentUser } from "@/lib/server/session";
import { isAdmin } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { contact, verified } = body as { contact?: string; verified?: boolean };
  if (!contact || typeof verified !== "boolean") {
    return Response.json({ error: "contact and verified are required." }, { status: 400 });
  }
  const database = await getDb();
  const result = await database
    .prepare("UPDATE users SET verified = ? WHERE contact = ? AND role = 'trainer'")
    .run(verified ? 1 : 0, contact.trim());
  if (Number(result.changes) === 0) {
    return Response.json({ error: "Trainer not found." }, { status: 404 });
  }
  return Response.json({ ok: true, contact: contact.trim(), verified });
}
