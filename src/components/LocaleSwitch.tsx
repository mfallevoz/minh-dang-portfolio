"use client";

import { locales, localeNames, type Locale } from "@/i18n/config";

/**
 * The only language switch on the site. It deliberately lives inside About
 * rather than the top bar: the title screen and the carousel stay uncluttered,
 * and visitors who care about the language are already reading a bio.
 *
 * Buttons, not links — the language is client state, so switching swaps the
 * text behind a glitch cut without a navigation, and you stay exactly where
 * you were reading.
 */
export default function LocaleSwitch({
  current,
  onChange,
}: {
  current: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="locale-switch">
      <span className="locale-switch-label">Language</span>
      <ul>
        {locales.map((locale) => (
          <li key={locale}>
            <button
              type="button"
              className={
                "locale-choice" + (locale === current ? " is-active" : "")
              }
              lang={locale}
              aria-pressed={locale === current}
              onClick={() => onChange(locale)}
            >
              {localeNames[locale]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
