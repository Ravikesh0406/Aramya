import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId, replaceTrainerPhoto } from "@/lib/server/trainers";
import { validateAndStore, storageConfigured } from "@/lib/server/storage";
import { rateLimited } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { dataUrl: "data:image/jpeg;base64,...", kind: "photo" | "document" }
 * Uploads are validated by declared MIME *and* magic bytes, then stored under a
 * random key. No SVG, no client-chosen filenames.
 */
export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limit = rateLimited(request, 10, 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: `Too many uploads. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  if (!storageConfigured()) {
    return Response.json(
      { error: "Uploads are not configured in this environment. Please contact support." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const dataUrl = typeof input.dataUrl === "string" ? input.dataUrl : "";
  const kind = input.kind === "document" ? "document" : "photo";
  const folder = input.folder === "certifications" ? "certifications" : "photos";

  const match = /^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return Response.json({ error: "Upload a JPEG, PNG or WebP file." }, { status: 400 });
  }
  const mime = match[1].toLowerCase();
  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return Response.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }

  const result = await validateAndStore(kind, mime, bytes, folder);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (kind === "photo") {
    await replaceTrainerPhoto(user.id, result.key);
  }

  return Response.json({ key: result.key, mime: result.mime }, { status: 201 });
}
