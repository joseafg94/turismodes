import en from "@/locales/en.json";
import es from "@/locales/es.json";

export type Locale = "es" | "en";

const translations = { es, en };

export function getTranslations(locale: Locale) {
  return translations[locale];
}
