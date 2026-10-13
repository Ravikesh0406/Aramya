// ARAMYA — reference data seed (categories + pricing limits).
//
// Mirrors the seed statements in migrations/0002_marketplace.sql so a truncated
// or freshly-created database always ends up with the same baseline. Idempotent.

const CATEGORIES: {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  requiresCertification: boolean;
}[] = [
  {
    slug: "yoga",
    name: "Yoga",
    description: "One-to-one yoga practice led by a professional trainer.",
    sortOrder: 10,
    requiresCertification: false,
  },
  {
    slug: "fitness-personal-training",
    name: "Fitness / Personal Training",
    description: "Goal-based personal training at home or online.",
    sortOrder: 20,
    requiresCertification: false,
  },
  {
    slug: "mobility",
    name: "Mobility",
    description: "Movement-focused sessions that build flexibility, control and range.",
    sortOrder: 30,
    requiresCertification: false,
  },
  {
    slug: "weight-management",
    name: "Weight Management",
    description: "Training and lifestyle guidance within professional qualifications.",
    sortOrder: 40,
    requiresCertification: false,
  },
  {
    slug: "womens-wellness",
    name: "Women's Wellness",
    description: "Strength, mobility and recovery focused sessions for women.",
    sortOrder: 50,
    requiresCertification: false,
  },
  {
    slug: "prenatal-postnatal-yoga",
    name: "Prenatal & Postnatal Yoga",
    description: "Specialised yoga practice for pregnancy and postnatal recovery.",
    sortOrder: 60,
    requiresCertification: true,
  },
  {
    slug: "meditation-mindfulness",
    name: "Meditation & Mindfulness",
    description: "Breathwork, meditation and mindfulness practice.",
    sortOrder: 70,
    requiresCertification: false,
  },
  {
    slug: "strength-fitness-training",
    name: "Strength & Fitness Training",
    description: "Structured strength and conditioning work.",
    sortOrder: 80,
    requiresCertification: false,
  },
  {
    slug: "senior-fitness-mobility",
    name: "Senior Fitness & Mobility",
    description: "Gentle, safe movement for older adults.",
    sortOrder: 90,
    requiresCertification: false,
  },
  {
    slug: "back-care-posture",
    name: "Back Care & Posture",
    description: "Movement and posture work within professional qualifications.",
    sortOrder: 100,
    requiresCertification: false,
  },
];

/** Placeholder bounds the owner will confirm: ₹200–₹5,000 per 60 minutes. */
const GLOBAL_MIN_PAISE = Number(process.env.PRICING_MIN_PAISE ?? 20000);
const GLOBAL_MAX_PAISE = Number(process.env.PRICING_MAX_PAISE ?? 500000);

export async function seedReferenceData(): Promise<void> {
  const { query } = await import("@/lib/server/db");
  for (const category of CATEGORIES) {
    await query(
      `INSERT INTO categories (slug, name, description, sort_order, requires_certification)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order,
         requires_certification = EXCLUDED.requires_certification`,
      [category.slug, category.name, category.description, category.sortOrder, category.requiresCertification],
    );
  }
  await query(
    `INSERT INTO pricing_limits (id, category_slug, min_paise, max_paise)
     VALUES ('limits-global', NULL, $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [GLOBAL_MIN_PAISE, GLOBAL_MAX_PAISE],
  );
}
