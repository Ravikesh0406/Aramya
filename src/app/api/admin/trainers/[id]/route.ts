import { getCurrentUser } from "@/lib/server/session";
import { isAdminUser } from "@/lib/server/admin";
import {
  clearTrainerBioOrPhoto,
  getCertificationById,
  listCategories,
  listTrainerCategories,
  listTrainerCertifications,
  setProfileStatus,
  setVerificationStatus,
} from "@/lib/server/trainers";
import { readStoredFile } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

/**
 * POST { action: "verify" | "reject" | "suspend" | "reactivate", note? }
 * Verifying a trainer in a certification-gated category requires a record on file.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const action = typeof input.action === "string" ? input.action : "";
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : null;

  if (action === "verify") {
    const categories = await listCategories(true);
    const gated = new Set(
      categories.filter((category) => category.requires_certification).map((category) => category.slug),
    );
    const selected = await listTrainerCategories(id);
    const needsCertification = selected.some((category) => gated.has(category.category_slug));
    if (needsCertification) {
      const certifications = await listTrainerCertifications(id);
      if (certifications.length === 0) {
        return Response.json(
          {
            error:
              "This trainer cannot be verified for a prenatal & postnatal category without a certification on file.",
          },
          { status: 409 },
        );
      }
    }
    await setVerificationStatus(id, "verified", note, admin?.name ?? "admin");
    return Response.json({ ok: true });
  }

  if (action === "reject") {
    await setVerificationStatus(id, "rejected", note || "Profile needs changes.", admin?.name ?? "admin");
    return Response.json({ ok: true });
  }

  if (action === "clearBio" || action === "clearPhoto") {
    await clearTrainerBioOrPhoto(id, {
      bio: action === "clearBio",
      photo: action === "clearPhoto",
    });
    return Response.json({ ok: true });
  }

  if (action === "suspend" || action === "reactivate") {
    await setProfileStatus(id, action === "suspend" ? "suspended" : "submitted");
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}

/** GET — private certification document stream (admin only). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser(request);
  if (!isAdminUser(admin)) {
    return Response.json({ error: "Admin access only." }, { status: 403 });
  }
  const { id } = await params;
  const certification = await getCertificationById(id);
  if (!certification?.document_key) {
    return Response.json({ error: "No document on file." }, { status: 404 });
  }
  const file = await readStoredFile(certification.document_key);
  if (!file) return Response.json({ error: "Document unavailable." }, { status: 404 });
  const extension = file.mime.split("/")[1] ?? "bin";
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="certification.${extension}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
