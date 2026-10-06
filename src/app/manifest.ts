import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ARAMYA — Fitness & wellness, at home",
    short_name: "ARAMYA",
    description: "Private at-home training: yoga, fitness, mobility and weight management.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F3EA",
    theme_color: "#183C32",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
