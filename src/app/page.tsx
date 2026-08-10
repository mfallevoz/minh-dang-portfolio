import type { Metadata } from "next";
import { site, sameAs } from "@/config";
import { getProjects } from "@/lib/projects";
import { siteUrl } from "@/lib/site-url";
import Experience from "@/components/Experience";

export const dynamic = "force-dynamic"; // project list is editable at runtime

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description:
    "Lucid — creative studio based in Saigon, working internationally. Brand films, commercials, fashion films, photography and editing.",
  keywords: [
    "Lucid",
    "creative studio Saigon",
    "creative studio Vietnam",
    "film director Vietnam",
    "cinematographer Vietnam",
    "director of photography",
    "video editor",
    "brand film",
    "commercial",
    "TVC",
    "fashion film",
    "photography",
    "international",
  ],
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    title: `${site.name} — ${site.role}`,
    description:
      "Creative studio based in Saigon, working internationally. Brand films, commercials, fashion films, photography and editing.",
    url: siteUrl,
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.role}`,
    description: "Creative studio based in Saigon, working internationally.",
  },
  robots: { index: true, follow: true },
};

export default async function HomePage() {
  const projects = await getProjects();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: siteUrl,
    email: `mailto:${site.email}`,
    sameAs,
    knowsLanguage: ["en", "vi"],
    knowsAbout: [
      "Brand films",
      "Commercials",
      "Fashion films",
      "Cinematography",
      "Film directing",
      "Video editing",
      "Photography",
    ],
    address: { "@type": "PostalAddress", addressCountry: site.country },
    areaServed: ["Vietnam", "Worldwide"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {projects.length === 0 ? (
        <main className="landing">
          <div className="landing-inner">
            <div className="landing-name">{site.wordmark}</div>
            <div className="landing-role">{site.role}</div>
            <p className="landing-empty">
              No videos yet — add them from <code>/admin</code>.
            </p>
          </div>
        </main>
      ) : (
        <Experience projects={projects} />
      )}
    </>
  );
}
