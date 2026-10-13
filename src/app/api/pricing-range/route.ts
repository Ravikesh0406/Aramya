import { allowedPriceRange } from "@/lib/server/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "";
  const duration = Number(url.searchParams.get("duration") ?? "0");
  const sessions = Number(url.searchParams.get("sessions") ?? "1");
  const range = await allowedPriceRange(category, duration, sessions);
  return Response.json({ range });
}
