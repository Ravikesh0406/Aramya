import type { MetadataRoute } from "next";
import { query } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Only publicly listed trainers are in the sitemap (same gate as search). */
async function listedTrainerSlugs(): Promise<string[]> {
  try {
    const rows = await query<{ slug: string }>(
      `SELECT p.slug FROM trainer_profiles p
         JOIN users u ON u.id = p.user_id
        WHERE p.status = 'submitted' AND p.verification_status = 'verified'
          AND EXISTS (SELECT 1 FROM trainer_offerings o WHERE o.trainer_id = u.id AND o.active = TRUE)
        ORDER BY p.created_at DESC
        LIMIT 2000`,
    );
    return rows.map((row) => row.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://aramya.co";
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/trainers`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/plans`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/for-trainers`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/book`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const serviceSlugs = [
    "yoga",
    "fitness-personal-training",
    "mobility",
    "weight-management",
  ];
  for (const slug of serviceSlugs) {
    staticRoutes.push({
      url: `${base}/services/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const trainerRoutes: MetadataRoute.Sitemap = (await listedTrainerSlugs()).map((slug) => ({
    url: `${base}/trainers/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...trainerRoutes];
}
