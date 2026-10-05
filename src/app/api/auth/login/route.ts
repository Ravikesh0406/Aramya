import { createSession, findUserByContactRole } from "@/lib/server/store";
import { setSessionCookie } from "@/lib/server/session";
import { verifyPassword } from "@/lib/server/password";
import { rateLimited } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const limited = rateLimited(request, "login", 10, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role === "trainer" ? "trainer" : "customer";

  if (!contact || !password) {
    return Response.json({ error: "Contact details and password are required." }, { status: 400 });
  }

  const user = await findUserByContactRole(contact, role);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "Invalid contact details, role, or password." }, { status: 401 });
  }

  const session = await createSession(user.id);
  const headers = new Headers({ "Content-Type": "application/json" });
  setSessionCookie(headers, session.token);
  return new Response(JSON.stringify({ user: { id: user.id, name: user.name, contact: user.contact, role: user.role } }), {
    status: 200,
    headers,
  });
}
