import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { deletePricingLimit, listPricingLimits, upsertPricingLimit } from "@/lib/server/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  return Response.json({ limits: await listPricingLimits() });
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const categorySlug = typeof input.categorySlug === "string" && input.categorySlug.trim() ? input.categorySlug : null;
  const minPaise = Number(input.minPaise);
  const maxPaise = Number(input.maxPaise);
  const id = typeof input.id === "string" ? input.id : undefined;

  if (!Number.isInteger(minPaise) || !Number.isInteger(maxPaise) || minPaise <= 0 || maxPaise < minPaise) {
    return Response.json(
      { error: "Enter a minimum and maximum per-60-minute price in paise (minimum first)." },
      { status: 400 },
    );
  }

  const limit = await upsertPricingLimit({ id, categorySlug, minPaise, maxPaise });
  return Response.json({ limit }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return Response.json({ error: "Missing limit id." }, { status: 400 });
  const removed = await deletePricingLimit(id);
  if (!removed) return Response.json({ error: "Limit not found." }, { status: 404 });
  return Response.json({ ok: true });
}
