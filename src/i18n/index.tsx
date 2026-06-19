import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TRANSLATIONS, type Locale, type TranslationKey } from "./translations";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "h2go.locale";

function readInitial(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const nav = window.navigator?.language?.toLowerCase() ?? "";
  return nav.startsWith("fr") ? "fr" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readInitial());
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>) {
    let str: string = (TRANSLATIONS[locale] as Record<string, string>)[key] ?? TRANSLATIONS.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used within LanguageProvider");
  return ctx;
}
