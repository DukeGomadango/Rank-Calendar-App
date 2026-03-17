import type { MetadataRoute } from "next";

const SITE_URL = "https://dango-schedule.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
