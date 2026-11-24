"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BOARD, BOARD_SIZE, SQUARE_NAME } from "@/shared/board.ts";
import type { Text } from "@/shared/i18n.ts";
import { useLang } from "@/lib/i18n";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import { sound } from "@/lib/sound";
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
  loading: () => <LoadingBoard />,
});

function LoadingBoard() {
  const { t } = useLang();
  return <div className="board3d board3d-loading">{t("Loading 3D board…", "Memuatkan papan 3D…")}</div>;
}

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
  notice: Text | null;
}

export default function GameView({ state, me, send, serverNow, move, roll, notice }: Props) {
  const { t, tr, lang } = useLang();
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
  // Once the token has finished walking, a card lifts off the right deck and flips over.
  const drawnDeck =
    stage.kind === "question" || stage.kind === "drumQuestion"
      ? stage.question.deck
      : stage.kind === "quarkPick"
        ? stage.deck
        : null;
  const drawn = drawnDeck && !walking ? { deck: drawnDeck, key: g.turnNumber } : null;

  // Sounds: a card whoosh when it's drawn, then a chime/buzz (+ coins) for the result.
  const drawnSig = drawn ? `${drawn.deck}:${drawn.key}` : null;
  useEffect(() => {
    if (drawnSig) sound.play("card");
  }, [drawnSig]);
  const resultKey = stage.kind === "result" ? stage.deadline : null;
  useEffect(() => {
    if (stage.kind !== "result") return;
    const r = stage.result;
    if (r.correctIndex !== undefined) {
      const someoneRight = Object.values(r.answers ?? {}).some((c) => c === r.correctIndex);
      const blocked = !!r.blocked;
      sound.play(someoneRight && !blocked ? "correct" : "wrong");
    }
    if ((r.deltas[me.id] ?? 0) > 0) setTimeout(() => sound.play("coin"), 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey]);

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
              drawn={drawn}
              lang={lang}
            />
          ) : view === "2d" ? (
            <Board players={state.players} currentId={currentId} move={move} />
          ) : (
            <div className="board3d board3d-loading" />
          )}
          {has3D && view && (
            <button className="btn btn-ghost btn-small view-toggle" onClick={() => setView(view === "3d" ? "2d" : "3d")}>
              {view === "3d" ? t("2D board", "Papan 2D") : t("3D board", "Papan 3D")}
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
                <strong>{t("Your turn! Roll the dice.", "Giliran anda! Baling dadu.")}</strong>
              ) : (
                <span>
                  {t("Turn: ", "Giliran ")}
                  <strong>{current.name}</strong>…
                </span>
              )
            ) : (
              <span>
                <strong>{current.name}</strong> {t("is on", "di petak")} {tr(SQUARE_NAME[BOARD[current.position].type])}
              </span>
            )}
            {notice && <div className="small notice" style={{ marginTop: 6 }}>{tr(notice)}</div>}
          </div>
          {stage.kind === "roll" && myTurn && (
            <button className="btn btn-primary btn-big" onClick={() => send({ type: "roll" })}>
              {t("Roll Dice", "Baling Dadu")}
            </button>
          )}
        </section>
      </div>

      <aside className="stack">
        <section className="panel center">
          <div className="muted small">{t("Time left", "Masa tinggal")}</div>
          <div className={`game-clock ${timeLeft < 60_000 ? "game-clock-low" : ""}`}>{formatClock(timeLeft)}</div>
          <div className="muted small">{t("Turn", "Pusingan")} {g.turnNumber}</div>
        </section>
        <PowerCard state={state} me={me} send={send} />
        <section className="panel">
          <PlayerPanel state={state} me={me} send={send} />
        </section>
        <section className="panel">
          <h3 className="small muted" style={{ margin: "0 0 8px" }}>
            {t("Game log", "Log permainan")}
          </h3>
          <ul className="game-log">
            {[...g.log].reverse().slice(0, 12).map((l, i) => (
              <li key={`${l.at}-${i}`}>{tr(l.text)}</li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
