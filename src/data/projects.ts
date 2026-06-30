// ─────────────────────────────────────────────────────────────────────────
//  PORTFOLIO DATA — TYPES, HELPERS & SEED
//
//  The live project list is no longer hard-coded here: it is edited from the
//  /admin page and persisted to storage (local file in dev, Vercel Blob in
//  prod) as `projects.json`. This file only defines the shape, the title
//  helper, and the SEED used the very first time (when no projects.json exists).
//
//  Every text field is OPTIONAL: empty fields are simply not shown on the site
//  (the cousin can leave some blank on purpose for a minimal look). On upload,
//  the title is pre-filled from the file name; it can then be edited or cleared.
// ─────────────────────────────────────────────────────────────────────────

// What is stored / edited in the admin.
export type StoredProject = {
  id: string;
  title?: string;
  client?: string;
  year?: number;
  category?: string;
  src: string; // video URL (e.g. /videos/x.mp4 in dev, or a Blob URL in prod)
  srcMobile?: string; // lighter, side-cropped (9:16) version for small screens
  poster?: string; // optional poster image URL
};

// What the site consumes (title is a string — empty when blank).
export type Project = StoredProject & { title: string };

// Derive a display title from a video file name (Title Case):
// "sur-le-fil.mp4" → "Sur Le Fil". Used to pre-fill the title on upload.
export function titleFromSrc(src: string): string {
  const file = (src.split("?")[0].split("/").pop() ?? src).trim();
  const base = file.replace(/\.[^.]+$/, "");
  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function resolveProject(p: StoredProject): Project {
  return { ...p, title: p.title ?? "" };
}

// Seed list — only used to initialise storage on first run in DEV.
export const seedProjects: StoredProject[] = [
  {
    id: "slide-1",
    title: "Slide 1",
    client: "Dir. Minh Dang",
    year: 2025,
    category: "Showreel",
    src: "/videos/slide-1.mp4",
    poster: "/videos/slide-1.jpg",
  },
  {
    id: "nuit-blanche",
    title: "Nuit Blanche",
    client: "Dir. Minh Dang",
    year: 2025,
    category: "Music Video",
    src: "/videos/nuit-blanche.mp4",
  },
  {
    id: "mirage",
    title: "Mirage",
    client: "Étoile Studios",
    year: 2025,
    category: "Commercial",
    src: "/videos/mirage.mp4",
  },
  {
    id: "sur-le-fil",
    title: "Sur Le Fil",
    client: "Aurora Records",
    year: 2024,
    category: "Music Video",
    src: "/videos/sur-le-fil.mp4",
  },
  {
    id: "echappee",
    title: "Échappée",
    client: "Studio Onze",
    year: 2024,
    category: "Short Film",
    src: "/videos/echappee.mp4",
  },
  {
    id: "contre-jour",
    title: "Contre-Jour",
    client: "Atelier Noir",
    year: 2023,
    category: "Fashion Film",
    src: "/videos/contre-jour.mp4",
  },
];
