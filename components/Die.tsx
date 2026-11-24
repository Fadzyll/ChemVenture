"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

// Which of the 9 grid cells (0..8) hold a pip for each face.
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const ROLL_MS = 800;

/**
 * 2D die. When `rollKey` changes it tumbles through random faces, then lands on `value`.
 * (The 3D physics die comes in Phase 5.)
 */
export default function Die({ value, rollKey, big }: { value: number | null; rollKey?: number; big?: boolean }) {
  const [shown, setShown] = useState<number | null>(value);
  const { t } = useLang();
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!rollKey) {
      setShown(value);
      return;
    }
    setRolling(true);
    const spin = setInterval(() => setShown(1 + Math.floor(Math.random() * 6)), 80);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setRolling(false);
      setShown(value);
    }, ROLL_MS);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
    // Only re-run when a new roll happens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey]);

  useEffect(() => {
    if (!rolling) setShown(value);
  }, [value, rolling]);

  const cls = ["die", big && "big", shown == null && "blank", rolling && "rolling"].filter(Boolean).join(" ");
  return (
    <div className={cls} role="img" aria-label={shown == null ? t("Not rolled yet", "Belum baling") : t(`Dice: ${shown}`, `Dadu: ${shown}`)}>
      {shown != null &&
        Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={PIPS[shown].includes(i) ? "pip" : undefined} />
        ))}
    </div>
  );
}
