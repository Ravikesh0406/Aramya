import { getUserBySessionToken, deleteSessionToken } from "@/lib/server/store";
import type { UserProfile } from "@/lib/models";

const COOKIE_NAME = "aramya_session";

export function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : undefined;
}

export async function getCurrentUser(request: Request): Promise<UserProfile | null> {
  return await getUserBySessionToken(getSessionToken(request));
}

export function setSessionCookie(headers: Headers, token: string) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  headers.append("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(headers: Headers) {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  headers.append("Set-Cookie", parts.join("; "));
}

export async function logoutRequest(request: Request) {
  await deleteSessionToken(getSessionToken(request));
}
