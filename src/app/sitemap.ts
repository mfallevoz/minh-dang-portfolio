import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const languages = {
    en: `${siteUrl}/en`,
    vi: `${siteUrl}/vi`,
  };
  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages },
    },
    ...locales.map((locale) => ({
      url: `${siteUrl}/${locale}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: { languages },
    })),
  ];
}
