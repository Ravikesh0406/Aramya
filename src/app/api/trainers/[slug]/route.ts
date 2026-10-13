import { getPublicTrainerProfile } from "@/lib/server/search";

export const dynamic = "force-dynamic";

/** Public profile JSON, allow-listed fields only (no contact or coordinates). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trainer = await getPublicTrainerProfile(slug);
  if (!trainer) {
    return Response.json({ error: "Trainer not found." }, { status: 404 });
  }
  return Response.json({ trainer });
}
