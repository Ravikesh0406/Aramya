// ARAMYA — trainer discovery.
//
// Public trainer data is served through the allow-list types below (D13):
// no contact, coordinates, password hashes, meeting links or document keys ever
// leave this module.

import { ensureSchema, query, queryOne } from "@/lib/server/db";
import { listTrainerCertifications } from "@/lib/server/trainers";
import {
  isPubliclyListed,
  listingFeeRequired,
  trainerHasActiveSubscription,
  type TrainerRecord,
} from "@/lib/server/trainers";
import { ratingSummaries, listReviewsForTrainer, type RatingSummary } from "@/lib/server/reviews";
import { coarseDistanceKm, distanceKm, withinRadius, type Coordinates } from "@/lib/geo";
import { normalizeAreaText, toMinutes, isValidPin, overlapsInterval } from "@/lib/validation";

export type TrainerFormat = import("@/lib/server/search-types").TrainerFormat;
export type PublicOffering = import("@/lib/server/search-types").PublicOffering;
export type PublicCategory = import("@/lib/server/search-types").PublicCategory;
export type PublicArea = import("@/lib/server/search-types").PublicArea;
export type PublicAvailabilityRange = { weekday: number; startTime: string; endTime: string };

export type PublicTrainerCard = {
  slug: string;
  name: string;
  photoKey: string | null;
  bio: string;
  yearsExperience: number;
  languages: string[];
  primaryCategory: PublicCategory | null;
  categories: PublicCategory[];
  areas: PublicArea[];
  formats: TrainerFormat[];
  fromPricePaise: number | null;
  fromDurationMin: number | null;
  fromSessions: number;
  distanceLabel: string | null;
  rating: RatingSummary | null;
  verified: boolean;
};

export type PublicTrainerProfile = PublicTrainerCard & {
  serviceRadiusKm: number;
  offerings: PublicOffering[];
  availability: PublicAvailabilityRange[];
  certifications: { name: string; issuer: string; year: number | null }[];
  reviews: { rating: number; comment: string; customerName: string; createdAt: string }[];
};

export const TIME_WINDOWS = {
  morning: { label: "Morning", start: "05:00", end: "12:00" },
  afternoon: { label: "Afternoon", start: "12:00", end: "17:00" },
  evening: { label: "Evening", start: "17:00", end: "22:00" },
} as const;

export type TimeWindowKey = keyof typeof TIME_WINDOWS;

type CandidateRow = {
  user_id: string;
  name: string;
  home_lat: number | null;
  home_lng: number | null;
  slug: string;
  bio: string;
  years_experience: number;
  languages: string;
  photo_key: string | null;
  service_radius_km: number;
  verification_status: string;
  status: string;
  has_active_offering: boolean;
};

type OfferingsByTrainer = Map<string, PublicOffering[]>;
type AreasByTrainer = Map<string, PublicArea[]>;
type AvailabilityByTrainer = Map<string, PublicAvailabilityRange[]>;
type CategoriesByTrainer = Map<string, PublicCategory[]>;

export type SearchQuery = {
  pin?: string | null;
  city?: string | null;
  locality?: string | null;
  lat?: number | null;
  lng?: number | null;
  category?: string | null;
  format?: "in_person" | "online" | null;
  minPricePaise?: number | null;
  maxPricePaise?: number | null;
  minExperience?: number | null;
  weekday?: number | null;
  window?: TimeWindowKey | null;
  minRating?: number | null;
  sort?: "relevance" | "price" | "experience" | "rating" | null;
};

export type SearchResults = {
  inPerson: PublicTrainerCard[];
  online: PublicTrainerCard[];
  areaHasInPerson: boolean;
  total: number;
};

type ListedCandidate = TrainerRecord & { hasActiveOffering: boolean };

async function loadCandidates(): Promise<ListedCandidate[]> {
  await ensureSchema();
  const rows = await query<CandidateRow>(
    `SELECT u.id AS user_id, u.name, u.home_lat, u.home_lng,
            p.slug, p.bio, p.years_experience, p.languages, p.photo_key,
            p.service_radius_km, p.verification_status, p.status,
            EXISTS (
              SELECT 1 FROM trainer_offerings o
               WHERE o.trainer_id = u.id AND o.active = TRUE
            ) AS has_active_offering
       FROM trainer_profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.status = 'submitted' AND p.verification_status = 'verified'
      ORDER BY p.created_at`,
  );
  return rows.map((row) => ({
    user_id: row.user_id,
    name: row.name,
    contact: "",
    email: null,
    verified: row.verification_status === "verified",
    home_lat: row.home_lat === null ? null : Number(row.home_lat),
    home_lng: row.home_lng === null ? null : Number(row.home_lng),
    home_accuracy_m: null,
    location_consent_at: null,
    hasActiveOffering: Boolean(row.has_active_offering),
    trainer_code: "",
    slug: row.slug,
    bio: row.bio,
    years_experience: Number(row.years_experience),
    languages: typeof row.languages === "string" ? JSON.parse(row.languages || "[]") : row.languages,
    photo_key: row.photo_key,
    service_radius_km: Number(row.service_radius_km),
    status: row.status as TrainerRecord["status"],
    verification_status: row.verification_status as TrainerRecord["verification_status"],
    verification_note: null,
    verified_at: null,
    submitted_at: null,
    created_at: "",
    updated_at: "",
  }));
}

async function loadAggregates(trainerIds: string[]): Promise<{
  offerings: OfferingsByTrainer;
  areas: AreasByTrainer;
  availability: AvailabilityByTrainer;
  categories: CategoriesByTrainer;
}> {
  const offerings: OfferingsByTrainer = new Map();
  const areas: AreasByTrainer = new Map();
  const availability: AvailabilityByTrainer = new Map();
  const categories: CategoriesByTrainer = new Map();
  if (trainerIds.length === 0) return { offerings, areas, availability, categories };

  const idList = trainerIds.map((_, index) => `$${index + 1}`).join(", ");
  const params = trainerIds;

  for (const row of await query<{
    id: string;
    trainer_id: string;
    category_slug: string;
    format: string;
    duration_min: number;
    price_paise: number;
    sessions_in_package: number;
  }>(
    `SELECT id, trainer_id, category_slug, format, duration_min, price_paise, sessions_in_package
       FROM trainer_offerings WHERE trainer_id IN (${idList}) AND active = TRUE`,
    params,
  )) {
    const list = offerings.get(row.trainer_id) ?? [];
    list.push({
      id: row.id,
      categorySlug: row.category_slug,
      format: row.format as TrainerFormat,
      durationMin: Number(row.duration_min),
      pricePaise: Number(row.price_paise),
      sessionsInPackage: Number(row.sessions_in_package),
    });
    offerings.set(row.trainer_id, list);
  }

  for (const row of await query<PublicArea & { trainer_id: string }>(
    `SELECT trainer_id, city, locality, pin_code AS "pinCode" FROM trainer_service_areas WHERE trainer_id IN (${idList})`,
    params,
  )) {
    const list = areas.get(row.trainer_id) ?? [];
    list.push({ city: row.city, locality: row.locality, pinCode: row.pinCode });
    areas.set(row.trainer_id, list);
  }

  for (const row of await query<{
    trainer_id: string;
    weekday: number;
    start_time: string;
    end_time: string;
  }>(
    `SELECT trainer_id, weekday, start_time, end_time FROM trainer_availability WHERE trainer_id IN (${idList})`,
    params,
  )) {
    const list = availability.get(row.trainer_id) ?? [];
    list.push({ weekday: Number(row.weekday), startTime: row.start_time, endTime: row.end_time });
    availability.set(row.trainer_id, list);
  }

  for (const row of await query<{
    trainer_id: string;
    category_slug: string;
    is_primary: boolean;
    name: string;
  }>(
    `SELECT tc.trainer_id, tc.category_slug, tc.is_primary, c.name
       FROM trainer_categories tc JOIN categories c ON c.slug = tc.category_slug
      WHERE tc.trainer_id IN (${idList}) AND c.active = TRUE`,
    params,
  )) {
    const list = categories.get(row.trainer_id) ?? [];
    list.push({ slug: row.category_slug, name: row.name, primary: Boolean(row.is_primary) });
    categories.set(row.trainer_id, list);
  }

  return { offerings, areas, availability, categories };
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

function windowRange(window: TimeWindowKey) {
  return {
    start: toMinutes(TIME_WINDOWS[window].start) ?? 0,
    end: toMinutes(TIME_WINDOWS[window].end) ?? 0,
  };
}

function matchesArea(
  trainerAreas: PublicArea[],
  query: { pin?: string | null; city?: string | null; locality?: string | null },
): boolean {
  const pin = query.pin && isValidPin(query.pin) ? query.pin : null;
  const city = query.city ? normalizeAreaText(query.city) : null;
  const locality = query.locality ? normalizeAreaText(query.locality) : null;

  return trainerAreas.some((area) => {
    if (pin && area.pinCode === pin) return true;
    if (city && locality && normalizeAreaText(area.city) === city && normalizeAreaText(area.locality) === locality) {
      return true;
    }
    if (city && !locality && normalizeAreaText(area.city) === city) return true;
    if (locality && !city && normalizeAreaText(area.locality) === locality) return true;
    return false;
  });
}

export async function searchTrainers(rawQuery: SearchQuery): Promise<SearchResults> {
  await ensureSchema();
  const query_ = rawQuery;
  const candidates = await loadCandidates();
  const customerPoint: Coordinates | null =
    typeof query_.lat === "number" && typeof query_.lng === "number" && (query_.lat !== 0 || query_.lng !== 0)
      ? { lat: query_.lat, lng: query_.lng }
      : null;

  const subscriberIds = listingFeeRequired()
    ? new Set(
        (await Promise.all(candidates.map(async (candidate) => ((await trainerHasActiveSubscription(candidate.user_id)) ? candidate.user_id : null))))
          .filter((id): id is string => Boolean(id)),
      )
    : null;

  const listed = candidates.filter((candidate) =>
    isPubliclyListed(candidate, {
      hasActiveOffering: candidate.hasActiveOffering,
      hasActiveSubscription: subscriberIds ? subscriberIds.has(candidate.user_id) : true,
    }),
  );
  if (listed.length === 0) {
    return { inPerson: [], online: [], areaHasInPerson: false, total: 0 };
  }

  const { offerings, areas, availability, categories } = await loadAggregates(
    listed.map((trainer) => trainer.user_id),
  );
  const ratings = await ratingSummaries();
  const userIdBySlug = new Map(listed.map((trainer) => [trainer.slug, trainer.user_id]));
  const trainerBySlug = new Map(listed.map((trainer) => [trainer.slug, trainer]));

  const hasLocationQuery = Boolean(query_.pin || query_.city || query_.locality || customerPoint);

  const cards: PublicTrainerCard[] = [];
  for (const trainer of listed) {
    const trainerOfferings = offerings.get(trainer.user_id) ?? [];
    if (trainerOfferings.length === 0) continue; // gate requires an active offering

    const trainerCategories = (categories.get(trainer.user_id) ?? []).map((category) => ({
      slug: category.slug,
      name: category.name,
      primary: category.primary,
    }));
    const trainerAreas = areas.get(trainer.user_id) ?? [];
      const formats = [...new Set(trainerOfferings.map((offering) => offering.format))];

    let distanceLabel: string | null = null;
    if (customerPoint && trainer.home_lat !== null && trainer.home_lng !== null) {
      distanceLabel = coarseDistanceKm(
        distanceKm(customerPoint, { lat: trainer.home_lat, lng: trainer.home_lng }),
      );
    }

    const affordable = trainerOfferings.filter((offering) => offering.sessionsInPackage === 1);
    const cheapest = affordable.length > 0 ? affordable[0] : trainerOfferings[0];

    cards.push({
      slug: trainer.slug,
      name: trainer.name,
      photoKey: trainer.photo_key,
      bio: trainer.bio,
      yearsExperience: trainer.years_experience,
      languages: parseLanguages(trainer.languages),
      primaryCategory: trainerCategories.find((category) => category.primary) ?? trainerCategories[0] ?? null,
      categories: trainerCategories,
      areas: trainerAreas,
      formats: formats as TrainerFormat[],
      fromPricePaise: cheapest.pricePaise,
      fromDurationMin: cheapest.durationMin,
      fromSessions: cheapest.sessionsInPackage,
      distanceLabel,
      rating: ratings.get(trainer.user_id)?.count ? (ratings.get(trainer.user_id) as RatingSummary) : null,
      verified: trainer.verification_status === "verified",
    });
  }

  // --- filters -------------------------------------------------------------
  const filtered = cards.filter((card) => {
    if (query_.category && !card.categories.some((category) => category.slug === query_.category)) return false;
    if (query_.format === "in_person" && !card.formats.includes("home_visit")) return false;
    if (query_.format === "online" && !card.formats.includes("online")) return false;
    if (typeof query_.minPricePaise === "number" && (card.fromPricePaise ?? Infinity) < query_.minPricePaise) {
      return false;
    }
    if (typeof query_.maxPricePaise === "number" && (card.fromPricePaise ?? -1) > query_.maxPricePaise) {
      return false;
    }
    if (typeof query_.minExperience === "number" && card.yearsExperience < query_.minExperience) return false;
    if (typeof query_.minRating === "number" && (!card.rating || card.rating.average! < query_.minRating)) {
      return false;
    }
    if (typeof query_.weekday === "number") {
      const ranges = availability.get(userIdBySlug.get(card.slug) ?? card.slug) ?? [];
      const windowRangeValue = query_.window ? windowRange(query_.window) : null;
      const matches = ranges.some(
        (range) =>
          range.weekday === query_.weekday &&
          (!windowRangeValue ||
            overlapsInterval(
              { start: toMinutes(range.startTime) ?? 0, end: toMinutes(range.endTime) ?? 0 },
              windowRangeValue,
            )),
      );
      if (!matches) return false;
    }
    return true;
  });

  // --- split: in-person first, online as fallback --------------------------
  const inPersonMatches = filtered.filter((card) => {
    const trainerAreas = areas.get(userIdBySlug.get(card.slug) ?? card.slug) ?? [];
    if (!card.formats.includes("home_visit")) return false;
    const byArea = matchesArea(trainerAreas, query_);
    const trainer = trainerBySlug.get(card.slug);
    const byRadius =
      customerPoint && trainer && trainer.home_lat !== null && trainer.home_lng !== null
        ? withinRadius(customerPoint, { lat: trainer.home_lat, lng: trainer.home_lng }, trainer.service_radius_km)
        : false;
    return byArea || byRadius;
  });

  const online = filtered.filter((card) => card.formats.includes("online"));

  // De-duplicate: an in-person match also shows in the online section only if
  // it teaches online; the two sections are distinct audiences.
  const inPerson = inPersonMatches;
  const areaHasInPerson = hasLocationQuery ? inPerson.length > 0 : false;

  // --- sort ----------------------------------------------------------------
  const sorters: Record<string, (a: PublicTrainerCard, b: PublicTrainerCard) => number> = {
    relevance: (a, b) => (a.distanceLabel === b.distanceLabel ? 0 : a.distanceLabel ? -1 : 1),
    price: (a, b) => (a.fromPricePaise ?? Infinity) - (b.fromPricePaise ?? Infinity),
    experience: (a, b) => b.yearsExperience - a.yearsExperience,
    rating: (a, b) => {
      if (a.rating && b.rating) return b.rating.average! - a.rating.average!;
      if (a.rating) return -1;
      if (b.rating) return 1;
      return b.yearsExperience - a.yearsExperience;
    },
  };
  const sorter = sorters[query_.sort ?? "relevance"] ?? sorters.relevance;
  inPerson.sort(sorter);
  online.sort(sorter);

  return { inPerson, online, areaHasInPerson, total: filtered.length };
}

export type PublicTrainerSummary = PublicTrainerCard & {
  trainerCode: string;
  contact: string;
  homeLat: number | null;
  homeLng: number | null;
  status: string;
};

/** Full public profile. Never includes private fields. */
export async function getPublicTrainerProfile(slug: string): Promise<PublicTrainerProfile | null> {
  await ensureSchema();
  const row = await queryOne<{
    user_id: string;
    name: string;
    slug: string;
    bio: string;
    years_experience: number;
    languages: string;
    photo_key: string | null;
    service_radius_km: number;
    verification_status: string;
  }>(
    `SELECT u.id AS user_id, u.name, p.slug, p.bio, p.years_experience, p.languages,
            p.photo_key, p.service_radius_km, p.verification_status
       FROM trainer_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.slug = $1 AND p.status = 'submitted' AND p.verification_status = 'verified'`,
    [slug],
  );
  if (!row) return null;

  const { offerings, areas, availability, categories } = await loadAggregates([row.user_id]);
  if ((offerings.get(row.user_id) ?? []).length === 0) return null;

  const summary = await ratingSummaries();
  const summaryForTrainer = summary.get(row.user_id);
  const reviews = await listReviewsForTrainer(row.user_id);
  const certificationRows = await listTrainerCertifications(row.user_id);
  const certificationsForTrainer = certificationRows.map((certification) => ({
    name: certification.name,
    issuer: certification.issuer,
    year: certification.year,
  }));
  const profileOfferings = offerings.get(row.user_id) ?? [];
  const cheapestProfile =
    profileOfferings.filter((offering) => offering.sessionsInPackage === 1)[0] ?? profileOfferings[0];

  return {
    slug: row.slug,
    name: row.name,
    photoKey: row.photo_key,
    bio: row.bio,
    yearsExperience: Number(row.years_experience),
    languages: parseLanguages(row.languages),
    primaryCategory: (categories.get(row.user_id) ?? []).find((category) => category.primary) ?? null,
    categories: (categories.get(row.user_id) ?? []).map((category) => ({
      slug: category.slug,
      name: category.name,
      primary: category.primary,
    })),
    areas: areas.get(row.user_id) ?? [],
    formats: [...new Set((offerings.get(row.user_id) ?? []).map((offering) => offering.format))],
    fromPricePaise: cheapestProfile?.pricePaise ?? null,
    fromDurationMin: cheapestProfile?.durationMin ?? null,
    fromSessions: cheapestProfile?.sessionsInPackage ?? 1,
    distanceLabel: null,
    rating: summaryForTrainer?.count ? summaryForTrainer : null,
    verified: row.verification_status === "verified",
    serviceRadiusKm: Number(row.service_radius_km),
    offerings: (offerings.get(row.user_id) ?? []).map((offering) => ({
      id: offering.id,
      categorySlug: offering.categorySlug,
      format: offering.format,
      durationMin: offering.durationMin,
      pricePaise: offering.pricePaise,
      sessionsInPackage: offering.sessionsInPackage,
    })),
    availability: availability.get(row.user_id) ?? [],
    certifications: certificationsForTrainer,
    reviews: reviews.map((review) => ({
      rating: review.rating,
      comment: review.comment,
      customerName: review.customer_name,
      createdAt: review.created_at,
    })),
  };
}

export async function searchTrainersByCategory(slug: string, limit = 6): Promise<PublicTrainerCard[]> {
  const results = await searchTrainers({ category: slug, sort: "relevance" });
  return [...results.inPerson, ...results.online].slice(0, limit);
}

export function categoriesWithTrainers(counts: Map<string, number>): string[] {
  return [...counts.entries()].filter(([, count]) => count > 0).map(([slug]) => slug);
}

export function formatPricePaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
