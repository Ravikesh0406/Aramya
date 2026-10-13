import { getCurrentUser } from "@/lib/server/session";
import { deleteOffering, getOfferingById, getTrainerByUserId, updateOffering } from "@/lib/server/trainers";
import { checkOfferingPrice, allowedPriceRange } from "@/lib/server/pricing";
import { isValidDuration } from "@/lib/validation";

export const dynamic = "force-dynamic";

function validateZoomUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== "zoom.us" && !host.endsWith(".zoom.us")) return null;
  return trimmed;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  const { id } = await params;
  const existing = await getOfferingById(id);
  if (!existing || existing.trainer_id !== user.id) {
    return Response.json({ error: "Offering not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const next = {
    categorySlug: typeof input.categorySlug === "string" ? input.categorySlug : existing.category_slug,
    format: (input.format === "online" ? "online" : input.format === "home_visit" ? "home_visit" : existing.format) as
      | "online"
      | "home_visit",
    durationMin: input.durationMin === undefined ? existing.duration_min : Number(input.durationMin),
    pricePaise: input.pricePaise === undefined ? existing.price_paise : Number(input.pricePaise),
    sessionsInPackage:
      input.sessionsInPackage === undefined ? existing.sessions_in_package : Number(input.sessionsInPackage),
    active: input.active === undefined ? existing.active : input.active === true,
  };

  let meetingUrl: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "meetingUrl")) {
    meetingUrl = validateZoomUrl(input.meetingUrl);
    if (input.meetingUrl && !meetingUrl) {
      return Response.json({ error: "That meeting link is not a valid Zoom URL." }, { status: 400 });
    }
  }
  if (next.format === "online" && next.active && !(meetingUrl ?? existing.meeting_url)) {
    return Response.json(
      { error: "Online sessions need a Zoom meeting link before they can go live." },
      { status: 400 },
    );
  }

  if (!isValidDuration(next.durationMin)) {
    return Response.json({ error: "Duration must be 15 to 180 minutes, in 15-minute steps." }, { status: 400 });
  }

  const priceCheck = await checkOfferingPrice({
    categorySlug: next.categorySlug,
    durationMin: next.durationMin,
    pricePaise: next.pricePaise,
    sessionsInPackage: next.sessionsInPackage,
  });
  if (!priceCheck.ok) {
    const range = await allowedPriceRange(next.categorySlug, next.durationMin, next.sessionsInPackage);
    return Response.json(
      { error: priceCheck.error, allowedRange: range ? { minPaise: range.minPaise, maxPaise: range.maxPaise } : null },
      { status: 400 },
    );
  }

  const offering = await updateOffering(id, user.id, { ...next, meetingUrl });
  if (!offering) return Response.json({ error: "Offering not found." }, { status: 404 });
  return Response.json({ offering });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const { id } = await params;
  const removed = await deleteOffering(id, user.id);
  if (!removed) return Response.json({ error: "Offering not found." }, { status: 404 });
  return Response.json({ ok: true });
}
