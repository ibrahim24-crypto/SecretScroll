'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const THEMES = ['purple', 'green', 'slate'] as const;
type ThemeColor = typeof THEMES[number];

type ThemeColorProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeColor;
  storageKey?: string;
};

type ThemeColorProviderState = {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
};

const initialState: ThemeColorProviderState = {
  theme: 'purple',
  setTheme: () => null,
};

const ThemeColorContext = createContext<ThemeColorProviderState>(initialState);

export function ColorThemeProvider({
  children,
  defaultTheme = 'purple',
  storageKey = 'secretscroll-color-theme',
}: ThemeColorProviderProps) {
  const [theme, setTheme] = useState<ThemeColor>(
    () => ((typeof window !== 'undefined' && localStorage.getItem(storageKey)) as ThemeColor) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes
    THEMES.forEach(t => root.classList.remove(`theme-${t}`));

    // Add the current theme class
    if (theme) {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: useCallback((newTheme: ThemeColor) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newTheme);
      }
      setTheme(newTheme);
    }, [storageKey]),
  };

  return (
    <ThemeColorContext.Provider value={value}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export const useColorTheme = () => {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
};
