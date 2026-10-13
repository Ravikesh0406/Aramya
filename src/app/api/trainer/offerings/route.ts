import { getCurrentUser } from "@/lib/server/session";
import {
  getTrainerByUserId,
  insertOffering,
  listTrainerOfferings,
} from "@/lib/server/trainers";
import { checkOfferingPrice, allowedPriceRange } from "@/lib/server/pricing";
import { isValidDuration } from "@/lib/validation";

export const dynamic = "force-dynamic";

function validateZoomUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) return null;
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

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  return Response.json({ offerings: await listTrainerOfferings(user.id) });
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const categorySlug = typeof input.categorySlug === "string" ? input.categorySlug : "";
  const format = input.format === "online" ? "online" : input.format === "home_visit" ? "home_visit" : null;
  const durationMin = Number(input.durationMin);
  const pricePaise = Number(input.pricePaise);
  const sessionsInPackage = Number(input.sessionsInPackage ?? 1);
  const active = input.active !== false;

  if (!format) {
    return Response.json({ error: "Choose whether sessions happen at home or online." }, { status: 400 });
  }
  if (!isValidDuration(durationMin)) {
    return Response.json(
      { error: "Duration must be 15 to 180 minutes, in 15-minute steps." },
      { status: 400 },
    );
  }
  if (!categorySlug) {
    return Response.json({ error: "Choose a category for this offering." }, { status: 400 });
  }

  const meetingUrl = validateZoomUrl(input.meetingUrl);
  if (format === "online" && active && !meetingUrl) {
    return Response.json(
      { error: "Online sessions need a Zoom meeting link (https, zoom.us) before they can go live." },
      { status: 400 },
    );
  }
  if (input.meetingUrl && !meetingUrl) {
    return Response.json({ error: "That meeting link is not a valid Zoom URL." }, { status: 400 });
  }

  const priceCheck = await checkOfferingPrice({
    categorySlug,
    durationMin,
    pricePaise,
    sessionsInPackage,
  });
  if (!priceCheck.ok) {
    const range = await allowedPriceRange(categorySlug, durationMin, sessionsInPackage);
    return Response.json(
      {
        error: priceCheck.error,
        allowedRange: range
          ? { minPaise: range.minPaise, maxPaise: range.maxPaise }
          : null,
      },
      { status: 400 },
    );
  }

  const offering = await insertOffering(user.id, {
    categorySlug,
    format,
    durationMin,
    pricePaise,
    sessionsInPackage,
    active,
    meetingUrl,
  });
  return Response.json({ offering }, { status: 201 });
}
