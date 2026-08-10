import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import LocaleSwitch from "./LocaleSwitch";

/**
 * "About" section — a full-screen slide hidden at the very bottom of the
 * carousel. Reachable only through the animated navigation (the video loop
 * never scrolls down this far).
 *
 * It also hosts the site's only language switch.
 */
export default function AboutSection({
  dict,
  locale,
  onLocaleChange,
}: {
  dict: Dictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  return (
    <section className="slide section">
      <div className="section-inner">
        <div className="section-label">{dict.about.label}</div>
        <h2 className="section-title">{dict.about.title}</h2>
        {dict.about.body.map((paragraph, i) => (
          <p
            key={i}
            className={"section-text" + (i > 0 ? " section-muted" : "")}
          >
            {paragraph}
          </p>
        ))}

        <LocaleSwitch current={locale} onChange={onLocaleChange} />
      </div>
    </section>
  );
}
