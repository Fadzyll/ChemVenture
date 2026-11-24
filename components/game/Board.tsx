"use client";

import { BOARD, BOARD_IMAGE } from "@/shared/board.ts";
import { CHARACTERS } from "@/shared/characters.ts";
import type { Player } from "@/shared/types.ts";
import { tokenOffset, useShownPositions, type MoveAnim } from "./useShownPositions";

export type { MoveAnim };

/**
 * 2D board using the real board artwork, with character tokens on top.
 * Used as a fallback when 3D isn't available, or when the player picks the 2D view.
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
  const shown = useShownPositions(players, move);

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
      <img className="board-img" src={BOARD_IMAGE.src} alt="ChemVenture board" draggable={false} />
      {currentSquare && <div className="board-highlight" style={cellStyle(currentSquare.col, currentSquare.row)} />}
      {[...bySquare.entries()].map(([pos, group]) => {
        const sq = BOARD[pos];
        return group.map((p, i) => {
          const c = p.character ? CHARACTERS[p.character] : null;
          const { dx, dy } = tokenOffset(i, group.length);
          const cx = BOARD_IMAGE.left + BOARD_IMAGE.cellW * (sq.col + 0.5 + dx);
          const cy = BOARD_IMAGE.top + BOARD_IMAGE.cellH * (sq.row + 0.5 + dy);
          return (
            <div
              key={p.id}
              className={`token ${p.id === currentId ? "token-active" : ""} ${p.connected ? "" : "token-off"}`}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, borderColor: c?.color ?? "#fff" }}
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
