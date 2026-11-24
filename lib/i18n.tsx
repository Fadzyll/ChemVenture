"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, pick, type Lang, type Text } from "@/shared/i18n.ts";

const KEY = "cv:lang";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** inline translation: t("English", "Bahasa Melayu") */
  t: (en: string, ms: string) => string;
  /** pick the right language from a bilingual Text sent by the server */
  tr: (text: Text | string) => string;
}

const Ctx = createContext<LangCtx>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (en) => en,
  tr: (x) => pick(x, DEFAULT_LANG),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "ms") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (en, ms) => (lang === "ms" ? ms : en),
      tr: (x) => pick(x, lang),
    }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** EN | BM switch. */
export function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label={t("Language", "Bahasa")}>
      {(["en", "ms"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          className={`lang-btn ${lang === l ? "on" : ""}`}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          title={l === "en" ? "English" : "Bahasa Melayu"}
        >
          {l === "en" ? "EN" : "BM"}
        </button>
      ))}
    </div>
  );
}
