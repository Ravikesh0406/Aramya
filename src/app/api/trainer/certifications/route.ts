import { getCurrentUser } from "@/lib/server/session";
import {
  getTrainerByUserId,
  listCategories,
  listTrainerCategories,
  listTrainerCertifications,
  replaceTrainerCertifications,
} from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const certifications = await listTrainerCertifications(user.id);
  // Document keys stay server-side; the UI gets a flag plus an id for viewing.
  return Response.json({
    certifications: certifications.map((certification) => ({
      id: certification.id,
      name: certification.name,
      issuer: certification.issuer,
      year: certification.year,
      hasDocument: Boolean(certification.document_key),
    })),
  });
}

/** PUT { certifications: [{ name, issuer, year, documentKey? }] } */
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
  if (!Array.isArray(input.certifications)) {
    return Response.json({ error: "Certifications must be a list." }, { status: 400 });
  }

  const certifications: { name: string; issuer: string; year: number | null; documentKey?: string | null }[] = [];
  for (const entry of input.certifications) {
    if (!entry || typeof entry !== "object") {
      return Response.json({ error: "Invalid certification entry." }, { status: 400 });
    }
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const issuer = typeof record.issuer === "string" ? record.issuer.trim() : "";
    const yearValue = record.year === undefined || record.year === null ? null : Number(record.year);
    if (!name) {
      return Response.json({ error: "Every certification needs a name." }, { status: 400 });
    }
    if (yearValue !== null && (!Number.isInteger(yearValue) || yearValue < 1950 || yearValue > 2100)) {
      return Response.json({ error: "Certification year must be between 1950 and 2100." }, { status: 400 });
    }
    certifications.push({
      name,
      issuer,
      year: yearValue,
      documentKey: typeof record.documentKey === "string" ? record.documentKey : null,
    });
  }

  // Categories flagged requires_certification must have at least one record.
  const categories = await listCategories(true);
  const selected = await listTrainerCategories(user.id);
  const requiresCertification = new Set(
    categories.filter((category) => category.requires_certification).map((category) => category.slug),
  );
  const needsCertification = selected.some((category) => requiresCertification.has(category.category_slug));
  if (needsCertification && certifications.length === 0) {
    return Response.json(
      { error: "Prenatal & postnatal categories require at least one certification on file." },
      { status: 400 },
    );
  }

  // Preserve existing private document keys when the edit does not re-upload.
  const existing = await listTrainerCertifications(user.id);
  for (const certification of certifications) {
    if (certification.documentKey) continue;
    const match = existing.find(
      (row) => row.name === certification.name && row.issuer === certification.issuer && row.year === certification.year,
    );
    if (match?.document_key) certification.documentKey = match.document_key;
  }

  await replaceTrainerCertifications(user.id, certifications);
  const trainer = await getTrainerByUserId(user.id);
  return Response.json({ trainer, certifications: await listTrainerCertifications(user.id) });
}
