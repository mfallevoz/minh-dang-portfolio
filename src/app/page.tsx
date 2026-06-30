import type { Metadata } from "next";
import Link from "next/link";
import { locales, localeNames } from "@/i18n/config";
import { site } from "@/config";
import { getProjects } from "@/lib/projects";
import { siteUrl } from "@/lib/site-url";
import PreloadVideos from "@/components/PreloadVideos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description:
    "Minh Dang — film director, cinematographer and editor (Vietnam & international). Brand films, commercials and fashion films. EN / Tiếng Việt.",
  alternates: {
    canonical: siteUrl,
    languages: {
      en: `${siteUrl}/en`,
      vi: `${siteUrl}/vi`,
      "x-default": siteUrl,
    },
  },
  openGraph: {
    type: "website",
    title: `${site.name} — ${site.role}`,
    description:
      "Film director, cinematographer and editor. Vietnam & international.",
    url: siteUrl,
    siteName: site.name,
  },
};

// How many videos to start fetching while the user picks a language, so the
// portfolio feels instant once they enter.
const PRELOAD_COUNT = 3;

export default async function LandingPage() {
  const projects = await getProjects();
  return (
    <main className="landing">
      <div className="landing-inner">
        <div className="landing-name">{site.wordmark}</div>
        <div className="landing-role">{site.role}</div>

        <nav className="landing-langs" aria-label="Select language">
          {locales.map((locale) => (
            <Link key={locale} href={`/${locale}`} className="lang-choice">
              {localeNames[locale]}
            </Link>
          ))}
        </nav>
      </div>

      {/* Preload the first videos while the user is choosing a language. */}
      <PreloadVideos
        items={projects.slice(0, PRELOAD_COUNT).map((p) => ({
          id: p.id,
          src: p.src,
          srcMobile: p.srcMobile,
        }))}
      />
    </main>
  );
}
