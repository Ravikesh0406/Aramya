import { createUser, createSession } from "@/lib/server/store";
import { setSessionCookie } from "@/lib/server/session";
import { hashPassword } from "@/lib/server/password";
import { rateLimited } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const limited = rateLimited(request, "signup", 10, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role === "trainer" ? "trainer" : "customer";

  if (!name) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  if (!contact) {
    return Response.json({ error: "Contact details are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: "Password should be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = createUser({ name, contact, role, passwordHash: hashPassword(password) });
    const session = createSession(user.id);
    const headers = new Headers({ "Content-Type": "application/json" });
    setSessionCookie(headers, session.token);
    return new Response(JSON.stringify({ user }), { status: 201, headers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not create account." },
      { status: 409 },
    );
  }
}
