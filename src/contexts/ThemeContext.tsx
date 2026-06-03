import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeSettings } from '../types';
import { loadTheme, saveTheme } from '../utils/storage';

interface ThemeContextType {
  theme: ThemeSettings;
  setMode: (mode: 'light' | 'dark') => void;
  setFontSize: (size: number) => void;
  setTypingSpeed: (speed: number) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const loaded = loadTheme();
    return {
      mode: loaded.mode,
      fontSize: loaded.fontSize,
      typingSpeed: loaded.typingSpeed ?? 15,
    };
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme.mode === 'dark');
    saveTheme(theme);
  }, [theme]);

  const setMode = useCallback((mode: 'light' | 'dark') => {
    setTheme(prev => ({ ...prev, mode }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setTheme(prev => ({ ...prev, fontSize }));
  }, []);

  const setTypingSpeed = useCallback((typingSpeed: number) => {
    setTheme(prev => ({ ...prev, typingSpeed }));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setMode, setFontSize, setTypingSpeed }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
