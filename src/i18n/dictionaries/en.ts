// English dictionary — this file is the source of truth for the dictionary
// shape. Every other language must match the `Dictionary` type derived from it.

// The dictionaries hold on-screen copy only. SEO metadata is not localised:
// the site serves a single URL, so it is declared once in `src/app/page.tsx`.
const en = {
  nav: {
    about: "About",
    contact: "Contact",
    home: "Home",
  },
  about: {
    label: "About",
    // No `title`: the section is headed by the logo, which is not translated.
    body: [
      "Director of photography & editor. Fashion films, MV and TVC — I tell stories through images, from creative to final.",
      "Based in Saigon · Available worldwide.",
    ],
  },
  contact: {
    label: "Contact",
    title: "Let's work together?",
    links: {
      email: "Email",
      instagram: "Instagram",
      zalo: "Zalo",
    },
    // note: "(Placeholder details — to be replaced.)",
  },
};

export default en;

export type Dictionary = typeof en;
