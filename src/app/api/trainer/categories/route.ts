import { getCurrentUser } from "@/lib/server/session";
import {
  getTrainerByUserId,
  listCategories,
  listTrainerCategories,
  replaceTrainerCategories,
} from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const [categories, selected] = await Promise.all([
    listCategories(true),
    user.role === "trainer" ? listTrainerCategories(user.id) : Promise.resolve([]),
  ]);
  return Response.json({ categories, selected });
}

export async function PUT(request: Request) {
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
  if (!Array.isArray(input.categories) || input.categories.length === 0) {
    return Response.json({ error: "Choose at least one category." }, { status: 400 });
  }

  const available = await listCategories(true);
  const known = new Set(available.map((category) => category.slug));
  const categories: { slug: string; primary: boolean }[] = [];
  for (const entry of input.categories) {
    if (!entry || typeof entry !== "object") {
      return Response.json({ error: "Invalid category entry." }, { status: 400 });
    }
    const record = entry as Record<string, unknown>;
    const slug = typeof record.slug === "string" ? record.slug : "";
    if (!known.has(slug)) {
      return Response.json({ error: "Choose categories from the list." }, { status: 400 });
    }
    categories.push({ slug, primary: record.primary === true });
  }
  if (!categories.some((category) => category.primary)) {
    categories[0].primary = true;
  }
  const primaries = categories.filter((category) => category.primary).length;
  if (primaries > 1) {
    return Response.json({ error: "Only one category can be your primary specialization." }, { status: 400 });
  }

  await replaceTrainerCategories(user.id, categories);
  const trainer = await getTrainerByUserId(user.id);
  return Response.json({
    trainer,
    categories: await listTrainerCategories(user.id),
  });
}
