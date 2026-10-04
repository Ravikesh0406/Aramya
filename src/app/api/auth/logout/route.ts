import { clearSessionCookie, logoutRequest } from "@/lib/server/session";

export async function POST(request: Request) {
  await logoutRequest(request);
  const headers = new Headers({ "Content-Type": "application/json" });
  clearSessionCookie(headers);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
