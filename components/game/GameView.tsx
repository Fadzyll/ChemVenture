"use client";

import { useEffect, useState } from "react";
import { BOARD, BOARD_SIZE, SQUARE_LABEL } from "@/shared/board.ts";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import Die from "../Die";
import Board, { type MoveAnim } from "./Board";
import PlayerPanel from "./PlayerPanel";
import StagePanel from "./StagePanel";
import { formatClock, useCountdown } from "./useCountdown";

export interface RollAnim {
  value: number;
  key: number;
}

interface Props {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
  serverNow: () => number;
  move: MoveAnim | null;
  roll: RollAnim | null;
  drumText: string | null;
}

export default function GameView({ state, me, send, serverNow, move, roll, drumText }: Props) {
  const g = state.game!;
  const currentId = state.turnOrder[g.turnIndex];
  const current = state.players.find((p) => p.id === currentId)!;
  const myTurn = currentId === me.id;
  const timeLeft = useCountdown(g.endsAt, serverNow);
  const stage = g.stage;

  // Let the token finish walking before the question pops up over the board.
  const [walking, setWalking] = useState(false);
  useEffect(() => {
    if (!move) return;
    const steps = (move.to - move.from + BOARD_SIZE) % BOARD_SIZE;
    setWalking(true);
    const t = setTimeout(() => setWalking(false), steps * 220 + 450);
    return () => clearTimeout(t);
  }, [move]);

  return (
    <div className="game-grid">
      <div className="stack">
        <div className="board-wrap">
          <Board players={state.players} currentId={currentId} move={move} />
          {stage.kind !== "roll" && !walking && (
            <div className="stage-overlay">
              <StagePanel state={state} me={me} send={send} serverNow={serverNow} />
            </div>
          )}
        </div>

        <section className="panel action-bar">
          <Die value={roll?.value ?? g.lastMove?.roll ?? null} rollKey={roll?.key} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {stage.kind === "roll" ? (
              myTurn ? (
                <strong>Giliran anda! Baling dadu.</strong>
              ) : (
                <span>
                  Giliran <strong>{current.name}</strong>…
                </span>
              )
            ) : (
              <span>
                <strong>{current.name}</strong> di petak {SQUARE_LABEL[BOARD[current.position].type]}
              </span>
            )}
            {drumText && <div className="small notice" style={{ marginTop: 6 }}>DRUM: {drumText}</div>}
          </div>
          {stage.kind === "roll" && myTurn && (
            <button className="btn btn-primary btn-big" onClick={() => send({ type: "roll" })}>
              Baling Dadu
            </button>
          )}
        </section>
      </div>

      <aside className="stack">
        <section className="panel center">
          <div className="muted small">Masa tinggal</div>
          <div className={`game-clock ${timeLeft < 60_000 ? "game-clock-low" : ""}`}>{formatClock(timeLeft)}</div>
          <div className="muted small">Pusingan {g.turnNumber}</div>
        </section>
        <section className="panel">
          <PlayerPanel state={state} me={me} send={send} />
        </section>
        <section className="panel">
          <h3 className="small muted" style={{ margin: "0 0 8px" }}>
            Log permainan
          </h3>
          <ul className="game-log">
            {[...g.log].reverse().slice(0, 12).map((l, i) => (
              <li key={`${l.at}-${i}`}>{l.text}</li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
