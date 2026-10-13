// ARAMYA — trainer identity, profiles, offerings, availability, areas, certifications.
//
// Every trainer account has one `trainer_profiles` row, created atomically at
// signup together with the user. Exact home coordinates live in `users` and are
// never exposed publicly (see `toPublicTrainer`).

import {
  ensureSchema,
  execute,
  query,
  queryOne,
  randomId,
  transaction,
} from "@/lib/server/db";

const TRAINER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz0123456789";

export const DURATION_MIN_MIN = 15;
export const DURATION_MAX_MIN = 180;
export const DURATION_STEP_MIN = 15;
export const BIO_MAX = 1200;
export const BIO_MIN = 40;
export const LANGUAGES_MAX = 6;

export type ProfileStatus = "draft" | "submitted" | "suspended";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type OfferingFormat = "home_visit" | "online";

export type TrainerRecord = {
  user_id: string;
  name: string;
  contact: string;
  email: string | null;
  verified: boolean;
  home_lat: number | null;
  home_lng: number | null;
  home_accuracy_m: number | null;
  location_consent_at: string | null;
  trainer_code: string;
  slug: string;
  bio: string;
  years_experience: number;
  languages: string[];
  photo_key: string | null;
  service_radius_km: number;
  status: ProfileStatus;
  verification_status: VerificationStatus;
  verification_note: string | null;
  verified_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainerProfileRow = Omit<TrainerRecord, "name" | "contact" | "email" | "verified" | "home_lat" | "home_lng" | "home_accuracy_m" | "location_consent_at">;

export type TrainerCategoryRow = { category_slug: string; is_primary: boolean };
export type TrainerOfferingRow = {
  id: string;
  trainer_id: string;
  category_slug: string;
  format: OfferingFormat;
  duration_min: number;
  price_paise: number;
  sessions_in_package: number;
  active: boolean;
  meeting_url: string | null;
  created_at: string;
  updated_at: string;
};
export type TrainerAreaRow = {
  id: string;
  trainer_id: string;
  city: string;
  locality: string;
  pin_code: string;
};
export type TrainerAvailabilityRow = {
  id: string;
  trainer_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};
export type TrainerCertificationRow = {
  id: string;
  trainer_id: string;
  name: string;
  issuer: string;
  year: number | null;
  document_key: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ identity */

export function generateTrainerCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += TRAINER_CODE_ALPHABET[Math.floor(Math.random() * TRAINER_CODE_ALPHABET.length)];
  }
  return `ARM-T-${code}`;
}

function randomSuffix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return out;
}

export function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "trainer";
}

function parseLanguages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toTrainerRecord(row: Record<string, unknown>): TrainerRecord {
  return {
    user_id: String(row.user_id),
    name: String(row.name ?? ""),
    contact: String(row.contact ?? ""),
    email: (row.email as string | null) ?? null,
    verified: Boolean(row.verified),
    home_lat: row.home_lat === null || row.home_lat === undefined ? null : Number(row.home_lat),
    home_lng: row.home_lng === null || row.home_lng === undefined ? null : Number(row.home_lng),
    home_accuracy_m:
      row.home_accuracy_m === null || row.home_accuracy_m === undefined
        ? null
        : Number(row.home_accuracy_m),
    location_consent_at: (row.location_consent_at as string | null) ?? null,
    trainer_code: String(row.trainer_code ?? ""),
    slug: String(row.slug ?? ""),
    bio: String(row.bio ?? ""),
    years_experience: Number(row.years_experience ?? 0),
    languages: parseLanguages(row.languages),
    photo_key: (row.photo_key as string | null) ?? null,
    service_radius_km: Number(row.service_radius_km ?? 5),
    status: (row.status as ProfileStatus) ?? "draft",
    verification_status: (row.verification_status as VerificationStatus) ?? "pending",
    verification_note: (row.verification_note as string | null) ?? null,
    verified_at: (row.verified_at as string | null) ?? null,
    submitted_at: (row.submitted_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const TRAINER_SELECT = `
  SELECT u.id AS user_id, u.name, u.contact, u.email, u.verified,
         u.home_lat, u.home_lng, u.home_accuracy_m, u.location_consent_at,
         p.trainer_code, p.slug, p.bio, p.years_experience, p.languages, p.photo_key,
         p.service_radius_km, p.status, p.verification_status, p.verification_note,
         p.verified_at, p.submitted_at, p.created_at, p.updated_at
    FROM trainer_profiles p
    JOIN users u ON u.id = p.user_id
`;

/** Creates the trainer_profiles row for an existing user, with unique code + slug. */
export async function createTrainerProfileForUser(
  userId: string,
  name: string,
  client: import("pg").PoolClient,
): Promise<TrainerProfileRow> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateTrainerCode();
    const slug = `${slugifyName(name)}-${randomSuffix(4)}`;
    try {
      const result = await client.query(
        `INSERT INTO trainer_profiles (user_id, trainer_code, slug)
         VALUES ($1, $2, $3)
         RETURNING user_id, trainer_code, slug, bio, years_experience, languages, photo_key,
                   service_radius_km, status, verification_status, verification_note, verified_at,
                   submitted_at, created_at, updated_at`,
        [userId, code, slug],
      );
      const row = result.rows[0];
      if (!row) break;
      return row as unknown as TrainerProfileRow;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") continue; // code/slug collision — retry
      throw error;
    }
  }
  throw new Error("Could not allocate a trainer code. Please try again.");
}

export async function getTrainerByUserId(userId: string): Promise<TrainerRecord | null> {
  await ensureSchema();
  const row = await queryOne<Record<string, unknown>>(`${TRAINER_SELECT} WHERE p.user_id = $1`, [userId]);
  return row ? toTrainerRecord(row) : null;
}

export async function getTrainerBySlug(slug: string): Promise<TrainerRecord | null> {
  await ensureSchema();
  const row = await queryOne<Record<string, unknown>>(`${TRAINER_SELECT} WHERE p.slug = $1`, [slug]);
  return row ? toTrainerRecord(row) : null;
}

export async function getTrainerByCode(code: string): Promise<TrainerRecord | null> {
  await ensureSchema();
  const row = await queryOne<Record<string, unknown>>(`${TRAINER_SELECT} WHERE p.trainer_code = $1`, [code]);
  return row ? toTrainerRecord(row) : null;
}

export async function updateTrainerBasics(
  userId: string,
  input: { bio?: string; yearsExperience?: number; languages?: string[]; email?: string; name?: string },
): Promise<void> {
  await ensureSchema();
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (typeof input.bio === "string") {
    params.push(input.bio);
    sets.push(`bio = $${params.length}`);
  }
  if (typeof input.yearsExperience === "number") {
    params.push(input.yearsExperience);
    sets.push(`years_experience = $${params.length}`);
  }
  if (Array.isArray(input.languages)) {
    params.push(JSON.stringify(input.languages));
    sets.push(`languages = $${params.length}`);
  }
  if (sets.length > 0) {
    params.push(userId);
    await execute(
      `UPDATE trainer_profiles SET ${sets.join(", ")}, updated_at = now() WHERE user_id = $${params.length}`,
      params,
    );
  }
  if (typeof input.email === "string") {
    await execute("UPDATE users SET email = $1 WHERE id = $2", [input.email.trim(), userId]);
  }
  if (typeof input.name === "string" && input.name.trim().length >= 2) {
    await execute("UPDATE users SET name = $1 WHERE id = $2", [input.name.trim(), userId]);
  }
}

export async function saveTrainerLocation(
  userId: string,
  input: { lat: number; lng: number; accuracy?: number | null; consent: boolean },
): Promise<void> {
  await ensureSchema();
  await execute(
    `UPDATE users
        SET home_lat = $1, home_lng = $2, home_accuracy_m = $3,
            location_consent_at = CASE WHEN $4::boolean THEN now() ELSE location_consent_at END
      WHERE id = $5`,
    [input.lat, input.lng, input.accuracy ?? null, input.consent, userId],
  );
}

export async function setServiceRadius(userId: string, radiusKm: number): Promise<void> {
  await ensureSchema();
  await execute("UPDATE trainer_profiles SET service_radius_km = $1, updated_at = now() WHERE user_id = $2", [
    radiusKm,
    userId,
  ]);
}

export async function replaceTrainerPhoto(userId: string, photoKey: string | null): Promise<void> {
  await ensureSchema();
  await execute("UPDATE trainer_profiles SET photo_key = $1, updated_at = now() WHERE user_id = $2", [
    photoKey,
    userId,
  ]);
}

/** Marks a profile as submitted for review (verification_status = 'pending'). */
export async function submitTrainerProfile(userId: string): Promise<TrainerRecord | null> {
  await ensureSchema();
  await execute(
    `UPDATE trainer_profiles
        SET status = 'submitted', verification_status = CASE WHEN verification_status = 'verified' THEN 'verified' ELSE 'pending' END,
            submitted_at = now(), updated_at = now()
      WHERE user_id = $1`,
    [userId],
  );
  return getTrainerByUserId(userId);
}

/* ---------------------------------------------------------------- categories */

export type CategoryRow = {
  slug: string;
  name: string;
  description: string;
  active: boolean;
  sort_order: number;
  requires_certification: boolean;
};

export async function listCategories(activeOnly = true): Promise<CategoryRow[]> {
  await ensureSchema();
  const rows = await query<CategoryRow>(
    `SELECT slug, name, description, active, sort_order, requires_certification
       FROM categories ${activeOnly ? "WHERE active = TRUE" : ""} ORDER BY sort_order, name`,
  );
  return rows;
}

export async function getCategory(slug: string): Promise<CategoryRow | null> {
  await ensureSchema();
  return queryOne<CategoryRow>(
    "SELECT slug, name, description, active, sort_order, requires_certification FROM categories WHERE slug = $1",
    [slug],
  );
}

export async function listTrainerCategories(userId: string): Promise<TrainerCategoryRow[]> {
  await ensureSchema();
  return query<TrainerCategoryRow>(
    "SELECT category_slug, is_primary FROM trainer_categories WHERE trainer_id = $1",
    [userId],
  );
}

export async function replaceTrainerCategories(
  userId: string,
  categories: { slug: string; primary?: boolean }[],
): Promise<void> {
  await ensureSchema();
  await transaction(async (client) => {
    await client.query("DELETE FROM trainer_categories WHERE trainer_id = $1", [userId]);
    for (const category of categories) {
      await client.query(
        `INSERT INTO trainer_categories (trainer_id, category_slug, is_primary)
         VALUES ($1, $2, $3)
         ON CONFLICT (trainer_id, category_slug) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
        [userId, category.slug, Boolean(category.primary)],
      );
    }
  });
}

/* ----------------------------------------------------------------- offerings */

export type OfferingInput = {
  categorySlug: string;
  format: OfferingFormat;
  durationMin: number;
  pricePaise: number;
  sessionsInPackage: number;
  active: boolean;
  meetingUrl?: string | null;
};

export async function listTrainerOfferings(userId: string): Promise<TrainerOfferingRow[]> {
  await ensureSchema();
  return query<TrainerOfferingRow>(
    "SELECT * FROM trainer_offerings WHERE trainer_id = $1 ORDER BY created_at",
    [userId],
  );
}

export async function getOfferingById(id: string): Promise<TrainerOfferingRow | null> {
  await ensureSchema();
  return queryOne<TrainerOfferingRow>("SELECT * FROM trainer_offerings WHERE id = $1", [id]);
}

export async function insertOffering(userId: string, input: OfferingInput): Promise<TrainerOfferingRow> {
  await ensureSchema();
  const row = await queryOne<TrainerOfferingRow>(
    `INSERT INTO trainer_offerings
       (id, trainer_id, category_slug, format, duration_min, price_paise, sessions_in_package, active, meeting_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      randomId(),
      userId,
      input.categorySlug,
      input.format,
      input.durationMin,
      input.pricePaise,
      input.sessionsInPackage,
      input.active,
      input.meetingUrl ?? null,
    ],
  );
  if (!row) throw new Error("Could not save offering.");
  return row;
}

export async function updateOffering(
  offeringId: string,
  userId: string,
  input: Partial<OfferingInput>,
): Promise<TrainerOfferingRow | null> {
  await ensureSchema();
  const existing = await queryOne<TrainerOfferingRow>(
    "SELECT * FROM trainer_offerings WHERE id = $1 AND trainer_id = $2",
    [offeringId, userId],
  );
  if (!existing) return null;

  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  const push = (column: string, value: string | number | boolean | null) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };
  if (input.categorySlug !== undefined) push("category_slug", input.categorySlug);
  if (input.format !== undefined) push("format", input.format);
  if (input.durationMin !== undefined) push("duration_min", input.durationMin);
  if (input.pricePaise !== undefined) push("price_paise", input.pricePaise);
  if (input.sessionsInPackage !== undefined) push("sessions_in_package", input.sessionsInPackage);
  if (input.active !== undefined) push("active", input.active);
  if (input.meetingUrl !== undefined) push("meeting_url", input.meetingUrl);

  if (sets.length === 0) return existing;
  params.push(offeringId);
  return queryOne<TrainerOfferingRow>(
    `UPDATE trainer_offerings SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${params.length} AND trainer_id = $${params.length + 1}
      RETURNING *`,
    [...params, userId],
  );
}

export async function deleteOffering(offeringId: string, userId: string): Promise<boolean> {
  await ensureSchema();
  const result = await execute("DELETE FROM trainer_offerings WHERE id = $1 AND trainer_id = $2", [
    offeringId,
    userId,
  ]);
  return result.changes > 0;
}

/* -------------------------------------------------------------- availability */

export async function listTrainerAvailability(userId: string): Promise<TrainerAvailabilityRow[]> {
  await ensureSchema();
  return query<TrainerAvailabilityRow>(
    "SELECT * FROM trainer_availability WHERE trainer_id = $1 ORDER BY weekday, start_time",
    [userId],
  );
}

export async function replaceTrainerAvailability(
  userId: string,
  ranges: { weekday: number; startTime: string; endTime: string }[],
): Promise<void> {
  await ensureSchema();
  await transaction(async (client) => {
    await client.query("DELETE FROM trainer_availability WHERE trainer_id = $1", [userId]);
    for (const range of ranges) {
      await client.query(
        `INSERT INTO trainer_availability (id, trainer_id, weekday, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)`,
        [randomId(), userId, range.weekday, range.startTime, range.endTime],
      );
    }
  });
}

/* --------------------------------------------------------------- service areas */

export async function listTrainerAreas(userId: string): Promise<TrainerAreaRow[]> {
  await ensureSchema();
  return query<TrainerAreaRow>("SELECT * FROM trainer_service_areas WHERE trainer_id = $1 ORDER BY city, locality", [
    userId,
  ]);
}

export async function replaceTrainerAreas(
  userId: string,
  areas: { city: string; locality: string; pinCode: string }[],
): Promise<void> {
  await ensureSchema();
  await transaction(async (client) => {
    await client.query("DELETE FROM trainer_service_areas WHERE trainer_id = $1", [userId]);
    for (const area of areas) {
      await client.query(
        `INSERT INTO trainer_service_areas (id, trainer_id, city, locality, pin_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [randomId(), userId, area.city, area.locality, area.pinCode],
      );
    }
  });
}

/* ------------------------------------------------------------- certifications */

export async function listTrainerCertifications(userId: string): Promise<TrainerCertificationRow[]> {
  await ensureSchema();
  return query<TrainerCertificationRow>(
    "SELECT * FROM trainer_certifications WHERE trainer_id = $1 ORDER BY year DESC NULLS LAST, name",
    [userId],
  );
}

export async function replaceTrainerCertifications(
  userId: string,
  certifications: { name: string; issuer: string; year: number | null; documentKey?: string | null }[],
): Promise<void> {
  await ensureSchema();
  await transaction(async (client) => {
    await client.query("DELETE FROM trainer_certifications WHERE trainer_id = $1", [userId]);
    for (const certification of certifications) {
      await client.query(
        `INSERT INTO trainer_certifications (id, trainer_id, name, issuer, year, document_key)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomId(),
          userId,
          certification.name,
          certification.issuer,
          certification.year,
          certification.documentKey ?? null,
        ],
      );
    }
  });
}

export async function getCertificationById(id: string): Promise<TrainerCertificationRow | null> {
  await ensureSchema();
  return queryOne<TrainerCertificationRow>("SELECT * FROM trainer_certifications WHERE id = $1", [id]);
}

/* ---------------------------------------------------------------- admin views */

export type AdminTrainerRow = {
  user_id: string;
  name: string;
  contact: string;
  email: string | null;
  trainer_code: string;
  slug: string;
  status: ProfileStatus;
  verification_status: VerificationStatus;
  verification_note: string | null;
  years_experience: number;
  photo_key: string | null;
  areas: string;
  categories: number;
  offerings: number;
  certifications: number;
  submitted_at: string | null;
  created_at: string;
};

export async function listTrainersForAdmin(filters: {
  status?: ProfileStatus | "all";
  verification?: VerificationStatus | "all";
  query?: string;
}): Promise<AdminTrainerRow[]> {
  await ensureSchema();
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (filters.status && filters.status !== "all") {
    params.push(filters.status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (filters.verification && filters.verification !== "all") {
    params.push(filters.verification);
    conditions.push(`p.verification_status = $${params.length}`);
  }
  if (filters.query) {
    params.push(`%${filters.query.toLowerCase()}%`);
    conditions.push(
      `(LOWER(u.name) LIKE $${params.length} OR LOWER(p.trainer_code) LIKE $${params.length} OR LOWER(p.slug) LIKE $${params.length} OR u.contact LIKE $${params.length})`,
    );
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<Record<string, unknown>>(
    `SELECT u.id AS user_id, u.name, u.contact, u.email, p.trainer_code, p.slug, p.status,
            p.verification_status, p.verification_note, p.years_experience, p.photo_key,
            p.submitted_at, p.created_at,
            (SELECT COUNT(*)::int FROM trainer_offerings o WHERE o.trainer_id = u.id) AS offerings,
            (SELECT COUNT(*)::int FROM trainer_categories c WHERE c.trainer_id = u.id) AS categories,
            (SELECT COUNT(*)::int FROM trainer_certifications k WHERE k.trainer_id = u.id) AS certifications,
            (SELECT COALESCE(STRING_AGG(DISTINCT a.city || ' / ' || a.locality, ', '), '')
               FROM trainer_service_areas a WHERE a.trainer_id = u.id) AS areas
       FROM trainer_profiles p JOIN users u ON u.id = p.user_id
       ${where}
      ORDER BY p.created_at DESC`,
    params,
  );
  return rows.map((row) => ({
    user_id: String(row.user_id),
    name: String(row.name),
    contact: String(row.contact),
    email: (row.email as string | null) ?? null,
    trainer_code: String(row.trainer_code),
    slug: String(row.slug),
    status: row.status as ProfileStatus,
    verification_status: row.verification_status as VerificationStatus,
    verification_note: (row.verification_note as string | null) ?? null,
    years_experience: Number(row.years_experience),
    photo_key: (row.photo_key as string | null) ?? null,
    areas: String(row.areas ?? ""),
    categories: Number(row.categories ?? 0),
    offerings: Number(row.offerings ?? 0),
    certifications: Number(row.certifications ?? 0),
    submitted_at: (row.submitted_at as string | null) ?? null,
    created_at: String(row.created_at),
  }));
}

export async function setVerificationStatus(
  userId: string,
  status: VerificationStatus,
  note: string | null,
  adminName: string,
): Promise<void> {
  await ensureSchema();
  await execute(
    `UPDATE trainer_profiles
        SET verification_status = $1, verification_note = $2, verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE NULL END,
            verified_by = $3, updated_at = now()
      WHERE user_id = $4`,
    [status, note, adminName, userId],
  );
  await execute("UPDATE users SET verified = $1 WHERE id = $2", [status === "verified", userId]);
}

/** Admin moderation: clear an offending bio and/or photo. */
export async function clearTrainerBioOrPhoto(
  userId: string,
  input: { bio?: boolean; photo?: boolean },
): Promise<void> {
  await ensureSchema();
  await transaction(async (client) => {
    if (input.bio) {
      await client.query("UPDATE trainer_profiles SET bio = '', updated_at = now() WHERE user_id = $1", [userId]);
    }
    if (input.photo) {
      await client.query("UPDATE trainer_profiles SET photo_key = NULL, updated_at = now() WHERE user_id = $1", [userId]);
    }
  });
}

export async function setProfileStatus(userId: string, status: ProfileStatus): Promise<void> {
  await ensureSchema();
  await execute("UPDATE trainer_profiles SET status = $1, updated_at = now() WHERE user_id = $2", [
    status,
    userId,
  ]);
}

export async function upsertCategory(input: {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  requiresCertification: boolean;
  active: boolean;
}): Promise<CategoryRow> {
  await ensureSchema();
  const row = await queryOne<CategoryRow>(
    `INSERT INTO categories (slug, name, description, sort_order, requires_certification, active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order,
       requires_certification = EXCLUDED.requires_certification, active = EXCLUDED.active
     RETURNING slug, name, description, active, sort_order, requires_certification`,
    [input.slug, input.name, input.description, input.sortOrder, input.requiresCertification, input.active],
  );
  if (!row) throw new Error("Could not save category.");
  return row;
}

/* ---------------------------------------------------------------- listing gate */

export type ListingContext = {
  hasActiveOffering: boolean;
  hasActiveSubscription: boolean;
};

/**
 * THE listing gate. One function, one module:
 * search, profile pages, sitemap and booking validation all call this.
 */
export function isPubliclyListed(
  trainer: Pick<TrainerRecord, "status" | "verification_status">,
  context: ListingContext,
): boolean {
  if (trainer.status !== "submitted") return false; // draft or suspended
  if (trainer.verification_status !== "verified") return false;
  if (!context.hasActiveOffering) return false;
  if (listingFeeRequired() && !context.hasActiveSubscription) return false;
  return true;
}

export function listingFeeRequired(): boolean {
  return (process.env.LISTING_FEE_REQUIRED ?? "false").toLowerCase() === "true";
}

export async function trainerHasActiveSubscription(userId: string): Promise<boolean> {
  await ensureSchema();
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM trainer_subscriptions
      WHERE trainer_id = $1 AND status = 'active' AND expires_at > now()`,
    [userId],
  );
  return (row?.count ?? 0) > 0;
}

export async function trainerHasActiveOffering(userId: string): Promise<boolean> {
  await ensureSchema();
  const row = await queryOne<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM trainer_offerings WHERE trainer_id = $1 AND active = TRUE",
    [userId],
  );
  return (row?.count ?? 0) > 0;
}

/** Convenience wrapper used by booking validation and profile pages. */
export async function isTrainerPubliclyListed(userId: string): Promise<boolean> {
  const trainer = await getTrainerByUserId(userId);
  if (!trainer) return false;
  const [hasActiveOffering, hasActiveSubscription] = await Promise.all([
    trainerHasActiveOffering(userId),
    listingFeeRequired() ? trainerHasActiveSubscription(userId) : Promise.resolve(true),
  ]);
  return isPubliclyListed(trainer, { hasActiveOffering, hasActiveSubscription });
}
