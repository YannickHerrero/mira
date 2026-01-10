import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/stores/language";
import type { SupportedLanguage } from "@/lib/i18n";

export function useLanguage() {
  const { i18n, t } = useTranslation();
  const { language, resolvedLanguage, isLoading, loadLanguage, setLanguage } =
    useLanguageStore();

  // Load language settings on mount
  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  // Sync i18n language with store
  useEffect(() => {
    if (!isLoading && i18n.language !== resolvedLanguage) {
      i18n.changeLanguage(resolvedLanguage);
    }
  }, [resolvedLanguage, isLoading, i18n]);

  return {
    language,
    resolvedLanguage,
    isLoading,
    setLanguage,
    t,
  };
}

export type { SupportedLanguage };
