// ARAMYA — profile reports (trust flow).

import { ensureSchema, execute, query, queryOne, randomId } from "@/lib/server/db";

export type ProfileReportRow = {
  id: string;
  trainer_id: string;
  reporter_contact: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  trainer_name: string;
  trainer_code: string;
  slug: string;
};

export async function listReports(status: "open" | "resolved" | "dismissed" | "all" = "open"): Promise<ProfileReportRow[]> {
  await ensureSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT r.id, r.trainer_id, r.reporter_contact, r.reason, r.details, r.status, r.created_at,
            r.resolved_at, u.name AS trainer_name, p.trainer_code, p.slug
       FROM profile_reports r
       JOIN trainer_profiles p ON p.user_id = r.trainer_id
       JOIN users u ON u.id = r.trainer_id
      ${status === "all" ? "" : "WHERE r.status = $1"}
      ORDER BY r.created_at DESC
      LIMIT 200`,
    status === "all" ? [] : [status],
  );
  return rows.map((row) => ({
    id: String(row.id),
    trainer_id: String(row.trainer_id),
    reporter_contact: String(row.reporter_contact),
    reason: String(row.reason),
    details: String(row.details ?? ""),
    status: String(row.status),
    created_at: String(row.created_at),
    resolved_at: (row.resolved_at as string | null) ?? null,
    trainer_name: String(row.trainer_name),
    trainer_code: String(row.trainer_code),
    slug: String(row.slug),
  }));
}

export async function resolveReport(id: string, status: "resolved" | "dismissed", adminName: string): Promise<boolean> {
  await ensureSchema();
  const result = await execute(
    `UPDATE profile_reports SET status = $1, resolved_at = now(), resolved_by = $2 WHERE id = $3`,
    [status, adminName, id],
  );
  return result.changes > 0;
}

export async function createProfileReport(input: {
  trainerId: string;
  contact: string;
  reason: string;
  details: string;
}): Promise<void> {
  await ensureSchema();
  await execute(
    `INSERT INTO profile_reports (id, trainer_id, reporter_contact, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomId(), input.trainerId, input.contact, input.reason, input.details],
  );
}

export async function countOpenReports(): Promise<number> {
  await ensureSchema();
  const row = await queryOne<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM profile_reports WHERE status = 'open'",
  );
  return row?.count ?? 0;
}
