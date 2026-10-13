import { ensureSchema, queryOne } from "@/lib/server/db";
import { readStoredFile, storageConfigured } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

/**
 * Public trainer photo by storage key. Only keys that exist on a trainer profile
 * are served; certification documents are never served here.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  await ensureSchema();
  const { key } = await params;
  const storageKey = (Array.isArray(key) ? key : [key]).join("/");
  if (!storageConfigured()) {
    return new Response("Uploads are not configured.", { status: 503 });
  }

  const owner = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM trainer_profiles WHERE photo_key = $1 LIMIT 1`,
    [storageKey],
  );
  if (!owner) {
    return new Response("Photo not found.", { status: 404 });
  }

  const file = await readStoredFile(storageKey);
  if (!file) return new Response("Photo not found.", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
