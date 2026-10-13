import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import { listCategories, upsertCategory } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9-]{2,60}$/;

export async function GET() {
  return Response.json({ categories: await listCategories(false) });
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
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const sortOrder = Number(input.sortOrder ?? 0);
  const requiresCertification = input.requiresCertification === true;
  const active = input.active !== false;

  if (!SLUG_PATTERN.test(slug) || !name) {
    return Response.json(
      { error: "Category needs a lowercase slug (letters, numbers, dashes) and a name." },
      { status: 400 },
    );
  }

  const category = await upsertCategory({
    slug,
    name,
    description,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    requiresCertification,
    active,
  });
  return Response.json({ category }, { status: 201 });
}
