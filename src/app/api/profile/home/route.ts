// POST /api/profile/home — trainer saves their home base (clustering anchor).
import { getCurrentUser } from "@/lib/server/session";
import { setHomeBase } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { lat, lng } = body as { lat?: number; lng?: number };
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "A valid GPS fix (lat, lng) is required." }, { status: 400 });
  }
  const updated = await setHomeBase(user.id, lat, lng);
  if (!updated) return Response.json({ error: "Unable to save home base." }, { status: 500 });
  return Response.json({ profile: updated });
}
