import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// The site is a single URL: the title screen, the portfolio and both languages
// are all states of the same page, resolved on the client.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
