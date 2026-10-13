import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/trainer", "/sessions", "/profile", "/login"],
      },
    ],
    sitemap: "https://aramya.co/sitemap.xml",
  };
}
