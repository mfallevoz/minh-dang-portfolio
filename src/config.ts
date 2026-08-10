// ─────────────────────────────────────────────────────────────────────────
//  SITE CONFIG
//  Language-neutral data (same across every locale): name, contact details…
//  Keep real contact info here so it lives in one place.
// ─────────────────────────────────────────────────────────────────────────

export const site = {
  name: "Lucid",
  wordmark: "LUCID", // shown as the logo (top-left)
  role: "Director · DP · Editor", // shown on the language landing page
  jobTitle: "Director, Cinematographer & Editor",
  country: "VN", // ISO country code (Vietnam) — used for SEO structured data

  // Background track for the portfolio. It never plays over the intro — the
  // film carries its own sound.
  //
  // 👉 TO CHANGE THE TRACK: drop the file in `public/music/` and point this
  //    here. Set it to "" (or delete the file) and the site simply runs
  //    silent — the audio module hides itself, nothing breaks.
  music: "/music/music.mp3",

  email: "hello@minhdang.com",
  instagram: { handle: "@minhdang", url: "https://instagram.com/" },
  vimeo: { handle: "vimeo.com/minhdang", url: "https://vimeo.com/" },
};

// Public profiles, used by SEO structured data (schema.org `sameAs`).
export const sameAs = [site.instagram.url, site.vimeo.url];
