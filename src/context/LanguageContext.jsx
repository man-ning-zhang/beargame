import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, detectLanguage, translate } from '../i18n';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'bearTogether.lang';

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used inside LanguageProvider');
  return context;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((next) => {
    if (LANGUAGES.includes(next)) setLangState(next);
  }, []);

  const toggle = useCallback(() => {
    setLangState((current) => (current === 'zh' ? 'en' : 'zh'));
  }, []);

  const t = useCallback((key, params) => translate(lang, key, params), [lang]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Language falls back to the browser default next time.
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = translate(lang, 'meta.title');
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
