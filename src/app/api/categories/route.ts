import { listCategories } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ categories: await listCategories(true) });
}
