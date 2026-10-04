import crypto from "crypto";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(derived, "hex");
  return candidate.length === known.length && crypto.timingSafeEqual(candidate, known);
}
