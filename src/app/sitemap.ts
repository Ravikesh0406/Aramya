import type { MetadataRoute } from "next";
import { SERVICES } from "@/lib/data";

const BASE = "https://aramya.co";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/services",
    "/book",
    "/plans",
    "/how-it-works",
    "/for-trainers",
    "/login",
    "/sessions",
    "/trainer",
  ];
  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...SERVICES.map((service) => ({
      url: `${BASE}/services/${service.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
