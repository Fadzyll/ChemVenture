"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD, BOARD_IMAGE, BOARD_SIZE } from "@/shared/board.ts";
import { CHARACTERS } from "@/shared/characters.ts";
import type { Player } from "@/shared/types.ts";

export interface MoveAnim {
  playerId: string;
  from: number;
  to: number;
  key: number;
}

const STEP_MS = 220;

/**
 * 2D board using the real board artwork, with character tokens on top.
 * Tokens walk square by square after a roll. (The 3D board comes in Phase 5.)
 */
export default function Board({
  players,
  currentId,
  move,
}: {
  players: Player[];
  currentId: string | null;
  move: MoveAnim | null;
}) {
  // Positions as displayed (may lag behind the real state while a token is walking).
  const [shown, setShown] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.position])),
  );
  const walking = useRef<string | null>(null);
  const latest = useRef(players);
  latest.current = players;

  // Walk animation for the latest dice move.
  useEffect(() => {
    if (!move) return;
    const steps = (move.to - move.from + BOARD_SIZE) % BOARD_SIZE;
    if (steps === 0) return;
    walking.current = move.playerId;
    let i = 0;
    setShown((s) => ({ ...s, [move.playerId]: move.from }));
    const t = setInterval(() => {
      i += 1;
      setShown((s) => ({ ...s, [move.playerId]: (move.from + i) % BOARD_SIZE }));
      if (i >= steps) {
        clearInterval(t);
        walking.current = null;
        // Catch up with anything that happened after the walk (e.g. a DRUM card sent them to RADIKAL).
        setTimeout(() => {
          const real = latest.current.find((p) => p.id === move.playerId);
          if (real) setShown((s) => ({ ...s, [real.id]: real.position }));
        }, 500);
      }
    }, STEP_MS);
    return () => {
      clearInterval(t);
      walking.current = null;
    };
  }, [move]);

  // Any other position change (e.g. sent to RADIKAL) jumps directly. Wait for walking tokens to finish.
  useEffect(() => {
    setShown((s) => {
      const next = { ...s };
      for (const p of players) if (walking.current !== p.id) next[p.id] = p.position;
      return next;
    });
  }, [players]);

  const onBoard = players.filter((p) => !p.eliminated);
  const bySquare = new Map<number, Player[]>();
  for (const p of onBoard) {
    const pos = shown[p.id] ?? p.position;
    bySquare.set(pos, [...(bySquare.get(pos) ?? []), p]);
  }
  const current = players.find((p) => p.id === currentId);
  const currentSquare = current ? BOARD[shown[current.id] ?? current.position] : null;

  const cellStyle = (col: number, row: number) => ({
    left: `${(BOARD_IMAGE.left + BOARD_IMAGE.cellW * col) * 100}%`,
    top: `${(BOARD_IMAGE.top + BOARD_IMAGE.cellH * row) * 100}%`,
    width: `${BOARD_IMAGE.cellW * 100}%`,
    height: `${BOARD_IMAGE.cellH * 100}%`,
  });

  return (
    <div className="board" style={{ aspectRatio: BOARD_IMAGE.aspect }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="board-img" src={BOARD_IMAGE.src} alt="Papan ChemVenture" draggable={false} />
      {currentSquare && <div className="board-highlight" style={cellStyle(currentSquare.col, currentSquare.row)} />}
      {[...bySquare.entries()].map(([pos, group]) => {
        const sq = BOARD[pos];
        return group.map((p, i) => {
          const c = p.character ? CHARACTERS[p.character] : null;
          // Spread up to 5 tokens around the centre of the square.
          const n = group.length;
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const r = n === 1 ? 0 : 0.24;
          const cx = BOARD_IMAGE.left + BOARD_IMAGE.cellW * (sq.col + 0.5 + Math.cos(angle) * r);
          const cy = BOARD_IMAGE.top + BOARD_IMAGE.cellH * (sq.row + 0.5 + Math.sin(angle) * r);
          return (
            <div
              key={p.id}
              className={`token ${p.id === currentId ? "token-active" : ""} ${p.connected ? "" : "token-off"}`}
              style={{
                left: `${cx * 100}%`,
                top: `${cy * 100}%`,
                borderColor: c?.color ?? "#fff",
              }}
              title={`${p.name}${c ? ` (${c.name})` : ""}`}
            >
              {c ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} draggable={false} />
              ) : (
                <span>{p.name[0]}</span>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}
