"use client";

import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import { useLang } from "@/lib/i18n";
import Die from "./Die";
import PlayerAvatar from "./PlayerAvatar";

export interface LastRoll {
  playerId: string;
  value: number;
  key: number;
}

interface Props {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
  lastRoll: LastRoll | null;
}

export default function RollPhase({ state, me, send, lastRoll }: Props) {
  const { t } = useLang();
  const isHost = state.hostId === me.id;
  const decided = state.phase !== "rolling";
  const rollers = state.players.filter((p) => p.mustRoll);
  const tieRound = state.rollRound > 1;

  // While rolling, show players by join order; once decided, by turn order.
  const players = decided
    ? state.turnOrder.map((id) => state.players.find((p) => p.id === id)!).filter(Boolean)
    : state.players;

  let banner: React.ReactNode = t("Roll the dice to decide turn order!", "Baling dadu untuk menentukan giliran!");
  if (decided)
    banner = (
      <>
        {t("Turn order decided! ", "Giliran ditentukan! ")}
        <strong>{players[0]?.name}</strong>
        {t(" goes first and picks a character first.", " bermula dan memilih karakter dahulu.")}
      </>
    );
  else if (tieRound)
    banner = (
      <>
        {t("Tie! ", "Seri! ")}
        <strong>{rollers.map((p) => p.name).join(", ")}</strong>
        {t(" roll again — scores are added.", " baling semula — skor akan ditambah.")}
      </>
    );

  return (
    <div className="stack">
      <div className="turn-banner">{banner}</div>

      {!decided && (
        <section className="panel center stack" style={{ alignItems: "center" }}>
          <Die
            big
            value={me.rolls.at(-1) ?? null}
            rollKey={lastRoll?.playerId === me.id ? lastRoll.key : undefined}
          />
          {me.mustRoll ? (
            <button className="btn btn-primary btn-big" onClick={() => send({ type: "roll" })}>
              {t("Roll Dice", "Baling Dadu")}
            </button>
          ) : (
            <div className="muted">
              {tieRound && me.rolls.length > 0 ? t("Your score is unique. ", "Skor anda unik. ") : ""}
              {t("Waiting for the other players to roll…", "Menunggu pemain lain membaling dadu…")}
            </div>
          )}
          <div className="small muted">{t("Your total", "Jumlah anda")}: {me.rollTotal}</div>
        </section>
      )}

      <section className="panel">
        <h2>{decided ? t("Turn Order", "Turutan Giliran") : t("Results", "Keputusan")}</h2>
        <div className="players">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`player ${p.id === me.id ? "me" : ""} ${p.mustRoll ? "active" : ""} ${p.connected ? "" : "offline"}`}
            >
              {decided && <span className="order-num">{i + 1}</span>}
              <PlayerAvatar player={p} />
              <div>
                <div className="player-name">{p.name}</div>
                <div className="roll-history">
                  {p.rolls.length === 0 ? t("Not rolled yet", "Belum baling") : `${t("Rolls", "Balingan")}: ${p.rolls.join(" + ")}`}
                </div>
              </div>
              <span className="spacer" />
              {!p.connected && <span className="badge badge-off">{t("Offline", "Terputus")}</span>}
              {isHost && !p.connected && p.mustRoll && (
                <button className="btn btn-ghost btn-small" onClick={() => send({ type: "actFor", playerId: p.id })}>
                  {t("Roll for them", "Baling untuknya")}
                </button>
              )}
              <Die value={p.rolls.at(-1) ?? null} rollKey={lastRoll?.playerId === p.id ? lastRoll.key : undefined} />
              <span className="roll-total">{p.rollTotal || "–"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
