import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId, replaceTrainerAreas, setServiceRadius, saveTrainerLocation } from "@/lib/server/trainers";
import { isValidPin } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** PUT { radiusKm, areas: [{ city, locality, pinCode }] } */
export async function PUT(request: Request) {
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

  const radiusKm = Number(input.radiusKm ?? trainer.service_radius_km);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
    return Response.json({ error: "Service radius must be between 1 and 100 km." }, { status: 400 });
  }

  const rawAreas = Array.isArray(input.areas) ? input.areas : [];
  const areas: { city: string; locality: string; pinCode: string }[] = [];
  for (const entry of rawAreas) {
    if (!entry || typeof entry !== "object") {
      return Response.json({ error: "Each service area needs a city, locality and PIN code." }, { status: 400 });
    }
    const record = entry as Record<string, unknown>;
    const city = typeof record.city === "string" ? record.city.trim() : "";
    const locality = typeof record.locality === "string" ? record.locality.trim() : "";
    const pinCode = typeof record.pinCode === "string" ? record.pinCode.trim() : "";
    if (!city || !pinCode) {
      return Response.json({ error: "City and PIN code are required for each service area." }, { status: 400 });
    }
    if (!isValidPin(pinCode)) {
      return Response.json({ error: "PIN codes must be six digits and cannot start with zero." }, { status: 400 });
    }
    areas.push({ city, locality, pinCode });
  }

  if (areas.length === 0) {
    return Response.json({ error: "Add at least one service area." }, { status: 400 });
  }

  await setServiceRadius(user.id, Math.round(radiusKm * 100) / 100);
  await replaceTrainerAreas(user.id, areas);
  const updated = await getTrainerByUserId(user.id);
  return Response.json({ trainer: updated });
}

/** POST { lat, lng, accuracy?, consent } — exact location stays private. */
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
  const input = body as Record<string, unknown>;
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ error: "A valid GPS fix is required." }, { status: 400 });
  }
  const accuracy = input.accuracy === undefined ? null : Number(input.accuracy);
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    return Response.json({ error: "Invalid accuracy value." }, { status: 400 });
  }
  const consent = input.consent === true;
  if (!consent) {
    return Response.json(
      { error: "Please confirm that your location is used only to match you with nearby customers." },
      { status: 400 },
    );
  }

  await saveTrainerLocation(user.id, { lat, lng, accuracy, consent: true });
  const trainer = await getTrainerByUserId(user.id);
  return Response.json({ trainer });
}
