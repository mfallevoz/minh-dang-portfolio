// Absolute base URL of the site, used for canonical/OG/sitemap/structured data.
//
// Priority:
//   1. NEXT_PUBLIC_SITE_URL  → set this to your custom domain on Vercel.
//   2. VERCEL_PROJECT_PRODUCTION_URL → auto-provided by Vercel (prod domain).
//   3. localhost (dev).
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");
