'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lang, TranslationKey, getTranslation } from '@/lib/i18n';

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('it');

  useEffect(() => {
    const savedLang = localStorage.getItem('iGO_menu_lang') as Lang;
    if (savedLang === 'it' || savedLang === 'en') {
      setLangState(savedLang);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'en') {
        setLangState('en');
      }
    }
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('iGO_menu_lang', newLang);
  };

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
    return getTranslation(lang, key, vars);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
};
