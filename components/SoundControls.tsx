"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sound } from "@/lib/sound";

/**
 * Starts audio on the visitor's first tap/click (browsers block audio before that)
 * and adds a soft click sound to every button. Mounted once in the root layout.
 */
export function AudioBoot() {
  useEffect(() => {
    const unlock = () => sound.unlock();
    const click = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("button:not(:disabled), a.btn")) sound.play("click");
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("click", click);
    };
  }, []);
  return null;
}

function useSoundSettings() {
  const snapshot = () => `${sound.musicOn}|${sound.sfxOn}`;
  const value = useSyncExternalStore(
    (fn) => sound.subscribe(fn),
    snapshot,
    () => "true|true",
  );
  const [music, sfx] = value.split("|").map((v) => v === "true");
  return { music, sfx };
}

/** Two small toggles: music and sound effects. */
export default function SoundControls() {
  const { music, sfx } = useSoundSettings();
  return (
    <div className="sound-controls" role="group" aria-label="Bunyi">
      <button
        type="button"
        className={`sound-btn ${music ? "on" : ""}`}
        onClick={() => sound.setMusic(!music)}
        aria-pressed={music}
        title={music ? "Matikan muzik" : "Hidupkan muzik"}
      >
        <span aria-hidden>{music ? "🎵" : "🔇"}</span>
        <span className="sound-label">Muzik</span>
      </button>
      <button
        type="button"
        className={`sound-btn ${sfx ? "on" : ""}`}
        onClick={() => sound.setSfx(!sfx)}
        aria-pressed={sfx}
        title={sfx ? "Matikan kesan bunyi" : "Hidupkan kesan bunyi"}
      >
        <span aria-hidden>{sfx ? "🔊" : "🔈"}</span>
        <span className="sound-label">Bunyi</span>
      </button>
    </div>
  );
}
