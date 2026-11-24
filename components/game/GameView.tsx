"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BOARD, BOARD_SIZE, SQUARE_LABEL } from "@/shared/board.ts";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import Die from "../Die";
import Board from "./Board";
import { STEP_MS, type MoveAnim } from "./useShownPositions";
import PlayerPanel from "./PlayerPanel";
import PowerCard from "./PowerCard";
import StagePanel from "./StagePanel";
import { formatClock, useCountdown } from "./useCountdown";

// three.js only runs in the browser, and is only downloaded when the game starts.
const Board3D = dynamic(() => import("./Board3D"), {
  ssr: false,
  loading: () => <div className="board3d board3d-loading">Memuatkan papan 3D…</div>,
});

const VIEW_KEY = "cv:view";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 3D by default; 2D if the device has no WebGL or the player chose 2D (remembered per browser). */
function useBoardView(): ["3d" | "2d" | null, (v: "3d" | "2d") => void, boolean] {
  const [view, setView] = useState<"3d" | "2d" | null>(null);
  const [has3D, setHas3D] = useState(false);
  useEffect(() => {
    const ok = supportsWebGL();
    setHas3D(ok);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {}
    setView(ok && saved !== "2d" ? "3d" : "2d");
  }, []);
  const choose = (v: "3d" | "2d") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };
  return [view, choose, has3D];
}

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
  notice: string | null;
}

export default function GameView({ state, me, send, serverNow, move, roll, notice }: Props) {
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
    const t = setTimeout(() => setWalking(false), steps * STEP_MS + 500);
    return () => clearTimeout(t);
  }, [move]);

  const [view, setView, has3D] = useBoardView();
  const deltas = stage.kind === "result" ? { values: stage.result.deltas, key: stage.deadline } : null;

  return (
    <div className="game-grid">
      <div className="stack">
        <div className="board-wrap">
          {view === "3d" ? (
            <Board3D
              players={state.players}
              currentId={currentId}
              move={move}
              roll={roll}
              lastRoll={g.lastMove?.roll || null}
              deltas={deltas}
            />
          ) : view === "2d" ? (
            <Board players={state.players} currentId={currentId} move={move} />
          ) : (
            <div className="board3d board3d-loading" />
          )}
          {has3D && view && (
            <button className="btn btn-ghost btn-small view-toggle" onClick={() => setView(view === "3d" ? "2d" : "3d")}>
              {view === "3d" ? "Papan 2D" : "Papan 3D"}
            </button>
          )}
          {stage.kind !== "roll" && !walking && (
            <div className="stage-overlay">
              <StagePanel state={state} me={me} send={send} serverNow={serverNow} />
            </div>
          )}
        </div>

        <section className="panel action-bar">
          {view !== "3d" && <Die value={roll?.value ?? g.lastMove?.roll ?? null} rollKey={roll?.key} />}
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
            {notice && <div className="small notice" style={{ marginTop: 6 }}>{notice}</div>}
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
        <PowerCard state={state} me={me} send={send} />
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
