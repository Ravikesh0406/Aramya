import { getCurrentUser } from "@/lib/server/session";
import { getCertificationById } from "@/lib/server/trainers";
import { readStoredFile } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

/** The owning trainer may read their own private certification documents. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const { id } = await params;
  const certification = await getCertificationById(id);
  if (!certification || certification.trainer_id !== user.id) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }
  if (!certification.document_key) {
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
