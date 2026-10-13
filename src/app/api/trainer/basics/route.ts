import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId, updateTrainerBasics, BIO_MAX, BIO_MIN } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
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

  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) return Response.json({ error: "Trainer profile not found." }, { status: 404 });

  const updates: { bio?: string; yearsExperience?: number; languages?: string[]; email?: string; name?: string } = {};

  if (input.name !== undefined) {
    const name = asString(input.name)?.trim() ?? "";
    if (name.length < 2 || name.length > 80) {
      return Response.json({ error: "Your name should be between 2 and 80 characters." }, { status: 400 });
    }
    updates.name = name;
  }

  if (input.bio !== undefined) {
    const bio = asString(input.bio)?.trim() ?? "";
    if (bio.length < BIO_MIN || bio.length > BIO_MAX) {
      return Response.json(
        { error: `Your bio should be between ${BIO_MIN} and ${BIO_MAX} characters.` },
        { status: 400 },
      );
    }
    updates.bio = bio;
  }

  if (input.yearsExperience !== undefined) {
    const years = Number(input.yearsExperience);
    if (!Number.isInteger(years) || years < 0 || years > 70) {
      return Response.json({ error: "Years of experience must be between 0 and 70." }, { status: 400 });
    }
    updates.yearsExperience = years;
  }

  if (input.languages !== undefined) {
    if (!Array.isArray(input.languages)) {
      return Response.json({ error: "Languages must be a list." }, { status: 400 });
    }
    const languages = input.languages
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
    if (languages.length === 0 || languages.length > 6) {
      return Response.json({ error: "Choose between one and six languages." }, { status: 400 });
    }
    updates.languages = [...new Set(languages)];
  }

  if (input.email !== undefined) {
    const email = asString(input.email)?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    updates.email = email;
  }

  await updateTrainerBasics(user.id, updates);
  const updated = await getTrainerByUserId(user.id);
  return Response.json({ trainer: updated });
}
