'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import ar from '@/locales/ar.json';

export type Locale = 'en' | 'fr' | 'ar';

const translations = { en, fr, ar };

// Helper to get nested keys. e.g., t('welcome.title')
const getTranslation = (locale: Locale, key: string): string => {  
  const keys = key.split('.');
  let result: any = translations[locale];
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // Fallback to English if key not found in current locale
      let fallbackResult: any = translations.en;
      for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
          if(fallbackResult === undefined) return key; // return key if not in english either
      }
      return fallbackResult || key;
    }
  }
  return result || key;
};

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string>) => string;
};

export const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => null,
  t: (key: string) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const storedLocale = localStorage.getItem('secretreels-locale') as Locale;
    if (storedLocale && ['en', 'fr', 'ar'].includes(storedLocale)) {
      setLocaleState(storedLocale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('secretreels-locale', newLocale);
  }, []);

  const t = useCallback((key: string, values?: Record<string, string>): string => {
    let text = getTranslation(locale, key);
    if (values) {
        Object.keys(values).forEach(valueKey => {
            text = text.replace(`{${valueKey}}`, values[valueKey]);
        })
    }
    return text;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
  }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}
