"use client";

/**
 * playerId lives in sessionStorage: it survives a refresh (so you get your seat back)
 * but each new browser tab is a new player, which makes testing 5 players on one PC easy.
 */
const ID_KEY = "cv:playerId";
const NAME_KEY = "cv:name";
const joinedKey = (code: string) => `cv:joined:${code}`;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getPlayerId(): string {
  return safe(() => {
    let id = sessionStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ID_KEY, id);
    }
    return id;
  }, "anon-" + Math.random().toString(36).slice(2, 12));
}

export const getSavedName = () => safe(() => localStorage.getItem(NAME_KEY) ?? "", "");
export const saveName = (name: string) => safe(() => localStorage.setItem(NAME_KEY, name), undefined);

/** Remembers that this tab joined `code` with `name`, so a refresh re-joins automatically. */
export const getJoinedName = (code: string) => safe(() => sessionStorage.getItem(joinedKey(code)), null);
export const setJoinedName = (code: string, name: string) =>
  safe(() => sessionStorage.setItem(joinedKey(code), name), undefined);
export const clearJoined = (code: string) => safe(() => sessionStorage.removeItem(joinedKey(code)), undefined);
