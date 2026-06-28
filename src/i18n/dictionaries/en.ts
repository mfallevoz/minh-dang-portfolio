// English dictionary — this file is the source of truth for the dictionary
// shape. Every other language must match the `Dictionary` type derived from it.

const en = {
  // SEO — edit freely to refine ranking keywords (see README → SEO).
  seo: {
    title: "Minh Dang — Director, DP & Editor | Brand & Fashion Films",
    description:
      "Minh Dang — film director, cinematographer and editor based in Vietnam, available internationally. Brand films, commercials (TVC) and fashion films.",
    keywords: [
      "Minh Dang",
      "film director Vietnam",
      "cinematographer Vietnam",
      "director of photography",
      "video editor",
      "brand film",
      "commercial",
      "TVC",
      "fashion film",
      "Vietnam",
      "international",
    ],
  },
  nav: {
    about: "About",
    contact: "Contact",
    home: "Home",
  },
  about: {
    label: "About",
    title: "Minh Dang",
    body: [
      "Director of photography & editor. Brand films, music videos and documentaries — I tell stories through images, from shoot to edit.",
      "Based in Paris · Available in France and worldwide.",
      "(Placeholder text — replace with the real bio.)",
    ],
  },
  contact: {
    label: "Contact",
    title: "Let's work together?",
    links: {
      email: "Email",
      instagram: "Instagram",
      vimeo: "Vimeo",
    },
    note: "(Placeholder details — to be replaced.)",
  },
};

export default en;

export type Dictionary = typeof en;
