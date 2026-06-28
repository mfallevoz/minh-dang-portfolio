import type { Locale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import vi from "./dictionaries/vi";

// Register every language dictionary here.
const dictionaries: Record<Locale, Dictionary> = { en, vi };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
