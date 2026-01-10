import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";

export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "de", "it", "pt"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
};

// Get initial language from device
export const getDeviceLanguage = (): SupportedLanguage => {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode || "en";

  // Map device language to supported languages
  if (languageCode.startsWith("fr")) return "fr";
  if (languageCode.startsWith("es")) return "es";
  if (languageCode.startsWith("de")) return "de";
  if (languageCode.startsWith("it")) return "it";
  if (languageCode.startsWith("pt")) return "pt";

  return "en"; // Default to English
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  compatibilityJSON: "v4", // For pluralization support
});

export default i18n;
