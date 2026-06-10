import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { en, type TranslationKey } from './en';
import { sv } from './sv';
import { es } from './es';
import { sl } from './sl';
import { de } from './de';
import { no } from './no';
import { da } from './da';
import { pt } from './pt';

// Languages available in the app. Add new codes here as dictionaries are added.
export type Lang = 'en' | 'sv' | 'es' | 'sl' | 'de' | 'no' | 'da' | 'pt';

// Register dictionaries per language. Each must implement every TranslationKey.
const dictionaries: Record<Lang, Record<TranslationKey, string>> = {
  en,
  sv,
  es,
  sl,
  de,
  no,
  da,
  pt,
};

// Selectable languages for the UI, shown with their native names (used by the
// language switcher on the settings page).
export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'sv', label: 'Svenska' },
  { code: 'es', label: 'Español' },
  { code: 'sl', label: 'Slovenščina' },
  { code: 'de', label: 'Deutsch' },
  { code: 'no', label: 'Norsk' },
  { code: 'da', label: 'Dansk' },
  { code: 'pt', label: 'Português' },
];

export const DEFAULT_LANG: Lang = 'en';
const STORAGE_KEY = 'linkportal.lang';

type Params = Record<string, string | number>;

function interpolate(str: string, params?: Params): string {
  if (!params) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{{${key}}}`
  );
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Params) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && stored in dictionaries) return stored;
  } catch {
    /* ignore storage errors */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage errors */
    }
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Params) => {
      const dict = dictionaries[lang] ?? dictionaries[DEFAULT_LANG];
      const template = dict[key] ?? en[key] ?? key;
      return interpolate(template, params);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  return ctx;
}
