// POST /api/auth/reset-confirm — redeem a reset code with a new password.
import { consumePasswordResetToken } from "@/lib/server/store";
import { hashPassword } from "@/lib/server/password";
import { rateLimited } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const limited = rateLimited(request, "reset-confirm", 10, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { contact, role, token, newPassword } = body as {
    contact?: string;
    role?: string;
    token?: string;
    newPassword?: string;
  };
  if (!contact || !token || !newPassword) {
    return Response.json({ error: "Contact, code and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ error: "Password should be at least 8 characters." }, { status: 400 });
  }
  const result = await consumePasswordResetToken(
    contact,
    role === "trainer" ? "trainer" : "customer",
    token,
    hashPassword(newPassword),
  );
  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }
  return Response.json({ ok: true, message: "Password updated — please sign in." });
}
