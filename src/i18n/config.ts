// ─────────────────────────────────────────────────────────────────────────
//  i18n CONFIG
//
//  👉 TO ADD A NEW LANGUAGE:
//     1. Add its code to `locales` below.
//     2. Add its native name to `localeNames`.
//     3. Create `src/i18n/dictionaries/<code>.ts` (copy `en.ts` as a template).
//     4. Register it in `src/i18n/index.ts`.
// ─────────────────────────────────────────────────────────────────────────

export const locales = ["en", "vi"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Each language displayed in its own language (used by the About switch).
export const localeNames: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

// Used to validate a stored preference or a browser language tag. The language
// never appears in the URL — it is client state, swapped behind a glitch cut.
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
