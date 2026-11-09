import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Language, getLocalizedText, getStatusLabel } from "@/lib/translations";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string, varsOrDefault?: Record<string, string | number> | string, defaultText?: string) => string;
  tStatus: (code: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("procureflow.language");
        if (saved && ["EN", "TE", "HI", "TA", "KN", "ML", "MR", "BN", "GU", "PA", "OR", "AS", "UR"].includes(saved)) {
          return saved as Language;
        }
      } catch {}
    }
    return "EN";
  });

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("procureflow.language", next);
        document.documentElement.lang = next.toLowerCase();
        window.dispatchEvent(new CustomEvent("languagechange", { detail: { language: next } }));
      } catch {}
    }
  }, []);

  const t = useCallback((key: string, varsOrDefault?: Record<string, string | number> | string, defaultText?: string): string => {
    if (!key) return "";
    let vars: Record<string, string | number> | undefined;
    let fallback = defaultText;
    if (typeof varsOrDefault === "object" && varsOrDefault !== null) {
      vars = varsOrDefault;
    } else if (typeof varsOrDefault === "string") {
      fallback = varsOrDefault;
    }
    const localized = getLocalizedText(key, language, vars);
    return localized || fallback || key;
  }, [language]);

  const tStatus = useCallback((code: string): string => {
    return getStatusLabel(code, language);
  }, [language]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language.toLowerCase();
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tStatus }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback if used outside Provider
    const saved = typeof window !== "undefined"
      ? (localStorage.getItem("procureflow.language") as Language) || "EN"
      : "EN";
    return {
      language: saved,
      setLanguage: () => {},
      t: (key: string, varsOrDefault?: Record<string, string | number> | string, defaultText?: string) => {
        let vars: Record<string, string | number> | undefined;
        let fallback = defaultText;
        if (typeof varsOrDefault === "object" && varsOrDefault !== null) {
          vars = varsOrDefault;
        } else if (typeof varsOrDefault === "string") {
          fallback = varsOrDefault;
        }
        return getLocalizedText(key, saved, vars) || fallback || key;
      },
      tStatus: (code: string) => getStatusLabel(code, saved),
    };
  }
  return context;
}
