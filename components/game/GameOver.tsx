"use client";

import { useEffect } from "react";
import { sound } from "@/lib/sound";
import { CHARACTERS } from "@/shared/characters.ts";
import { coinPoints } from "@/shared/config.ts";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import PlayerAvatar from "../PlayerAvatar";
import { Coins } from "./PlayerPanel";

export default function GameOver({
  state,
  me,
  send,
  onLeave,
}: {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
  onLeave: () => void;
}) {
  const g = state.game!;
  const ranked = state.players
    .filter((p) => state.turnOrder.includes(p.id))
    .sort((a, b) => coinPoints(b.coins) - coinPoints(a.coins));
  const winners = ranked.filter((p) => g.winnerIds.includes(p.id));
  const isHost = state.hostId === me.id;
  useEffect(() => {
    sound.play("fanfare");
    const t = setTimeout(() => sound.play("fanfare"), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="stack" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="turn-banner">
        {g.endReason === "time" ? "Masa tamat!" : "Hanya seorang pemain tinggal!"}{" "}
        <strong>{winners.map((p) => p.name).join(" & ")}</strong> menang!
      </div>

      <div className="winner-row">
        {winners.map((p) => {
          const c = p.character ? CHARACTERS[p.character] : null;
          return (
            <div key={p.id} className="winner">
              <div className="crown">👑</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c && <img src={c.image} alt={c.name} />}
              <div className="char-name">{p.name}</div>
              <div style={{ fontWeight: 600 }}>{coinPoints(p.coins)} mata</div>
            </div>
          );
        })}
      </div>

      <section className="panel">
        <h2>Kedudukan</h2>
        <div className="players">
          {ranked.map((p, i) => (
            <div key={p.id} className={`player ${p.id === me.id ? "me" : ""}`}>
              <span className="order-num">{i + 1}</span>
              <PlayerAvatar player={p} />
              <div style={{ flex: 1 }}>
                <div className="player-name">
                  {p.name} {p.eliminated && <span className="badge badge-off">Tersingkir</span>}
                </div>
                <Coins p={p} />
              </div>
              <strong>{coinPoints(p.coins)} mata</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="row" style={{ justifyContent: "center" }}>
        {isHost ? (
          <button className="btn btn-primary btn-big" onClick={() => send({ type: "playAgain" })}>
            Main semula
          </button>
        ) : (
          <span className="muted">Menunggu hos untuk main semula…</span>
        )}
        <button className="btn btn-ghost" onClick={onLeave}>
          Keluar
        </button>
      </div>
    </div>
  );
}
