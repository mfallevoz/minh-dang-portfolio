// ─────────────────────────────────────────────────────────────────────────
//  SITE CONFIG
//  Language-neutral data (same across every locale): name, contact details…
//  Keep real contact info here so it lives in one place.
// ─────────────────────────────────────────────────────────────────────────

export const site = {
  name: "Minh Dang",
  wordmark: "MINH DANG", // shown as the logo (top-left)
  role: "Director · DP · Editor", // shown on the language landing page
  jobTitle: "Director, Cinematographer & Editor",
  country: "VN", // ISO country code (Vietnam) — used for SEO structured data
  email: "hello@minhdang.com",
  instagram: { handle: "@minhdang", url: "https://instagram.com/" },
  vimeo: { handle: "vimeo.com/minhdang", url: "https://vimeo.com/" },
};

// Public profiles, used by SEO structured data (schema.org `sameAs`).
export const sameAs = [site.instagram.url, site.vimeo.url];
