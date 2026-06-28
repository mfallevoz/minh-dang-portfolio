import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Carousel from "@/components/Carousel";
import { getDictionary } from "@/i18n";
import { locales, isLocale } from "@/i18n/config";
import { getProjects } from "@/lib/projects";
import { site, sameAs } from "@/config";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic"; // project list is editable at runtime

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const hreflang = {
  en: `${siteUrl}/en`,
  vi: `${siteUrl}/vi`,
  "x-default": siteUrl,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { seo } = getDictionary(locale);
  const url = `${siteUrl}/${locale}`;
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: url, languages: hreflang },
    openGraph: {
      type: "website",
      title: seo.title,
      description: seo.description,
      url,
      siteName: site.name,
      locale: locale === "vi" ? "vi_VN" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const projects = await getProjects();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url: siteUrl,
    jobTitle: site.jobTitle,
    email: `mailto:${site.email}`,
    sameAs,
    knowsLanguage: ["vi", "en"],
    knowsAbout: [
      "Brand films",
      "Commercials",
      "Fashion films",
      "Cinematography",
      "Film directing",
      "Video editing",
    ],
    address: { "@type": "PostalAddress", addressCountry: site.country },
    areaServed: ["Vietnam", "Worldwide"],
  };

  const structuredData = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );

  if (projects.length === 0) {
    return (
      <main className="landing">
        {structuredData}
        <div className="landing-inner">
          <div className="landing-name">{site.wordmark}</div>
          <div className="landing-role">{site.role}</div>
          <p className="landing-empty">
            No videos yet — add them from <code>/admin</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {structuredData}
      <Carousel dict={dict} locale={locale} projects={projects} />
    </>
  );
}
