"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_SIZE } from "@/shared/board.ts";
import type { Player } from "@/shared/types.ts";

export interface MoveAnim {
  playerId: string;
  from: number;
  to: number;
  key: number;
}

export const STEP_MS = 260;

/**
 * Board positions as they should be *displayed*: after a dice roll the token walks
 * one square every STEP_MS instead of jumping. Used by both the 2D and the 3D board.
 */
export function useShownPositions(players: Player[], move: MoveAnim | null): Record<string, number> {
  const [shown, setShown] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.position])),
  );
  const walking = useRef<string | null>(null);
  const latest = useRef(players);
  latest.current = players;

  useEffect(() => {
    if (!move) return;
    const steps = (move.to - move.from + BOARD_SIZE) % BOARD_SIZE;
    if (steps === 0) return;
    walking.current = move.playerId;
    let i = 0;
    let catchUp: ReturnType<typeof setTimeout> | undefined;
    setShown((s) => ({ ...s, [move.playerId]: move.from }));
    const t = setInterval(() => {
      i += 1;
      setShown((s) => ({ ...s, [move.playerId]: (move.from + i) % BOARD_SIZE }));
      if (i >= steps) {
        clearInterval(t);
        walking.current = null;
        // Catch up with anything that happened after the walk (e.g. a DRUM card sent them to RADIKAL).
        catchUp = setTimeout(() => {
          const real = latest.current.find((p) => p.id === move.playerId);
          if (real) setShown((s) => ({ ...s, [real.id]: real.position }));
        }, 500);
      }
    }, STEP_MS);
    return () => {
      clearInterval(t);
      if (catchUp) clearTimeout(catchUp);
      walking.current = null;
    };
  }, [move]);

  // Any other position change (e.g. sent to RADIKAL) jumps directly; walking tokens finish first.
  useEffect(() => {
    setShown((s) => {
      const next = { ...s };
      for (const p of players) if (walking.current !== p.id) next[p.id] = p.position;
      return next;
    });
  }, [players]);

  return shown;
}

/** Where a token sits inside its square when several share it (fractions of a cell, from the centre). */
export function tokenOffset(i: number, n: number): { dx: number; dy: number } {
  if (n <= 1) return { dx: 0, dy: 0 };
  const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { dx: Math.cos(angle) * 0.24, dy: Math.sin(angle) * 0.24 };
}
