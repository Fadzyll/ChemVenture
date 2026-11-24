/**
 * Languages. The server sends every message in both languages (a `Text`),
 * and each player's screen shows the one they picked. English is the default.
 */
export type Lang = "en" | "ms";
export const LANGS: Lang[] = ["en", "ms"];
export const DEFAULT_LANG: Lang = "en";

export interface Text {
  en: string;
  ms: string;
}

/** Build a bilingual text: tx("English", "Bahasa Melayu"). */
export const tx = (en: string, ms: string): Text => ({ en, ms });

/** Same text in both languages (names, symbols). */
export const same = (s: string): Text => ({ en: s, ms: s });

export const pick = (t: Text | string, lang: Lang): string => (typeof t === "string" ? t : t[lang]);

/** Join bilingual pieces into one bilingual text. */
export function join(parts: (Text | string)[], sep = ""): Text {
  return {
    en: parts.map((p) => pick(p, "en")).join(sep),
    ms: parts.map((p) => pick(p, "ms")).join(sep),
  };
}
