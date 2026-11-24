"use client";

import { useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";
import { canStart } from "@/shared/rules.ts";
import { MAX_PLAYERS, MIN_PLAYERS, type ClientMessage, type Player, type RoomState } from "@/shared/types.ts";
import PlayerAvatar from "./PlayerAvatar";

interface Props {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
  onLeave: () => void;
}

export default function Lobby({ state, me, send, onLeave }: Props) {
  const isHost = state.hostId === me.id;
  const [copied, setCopied] = useState(false);
  const readyCount = state.players.filter((p) => p.ready).length;
  const startable = canStart(state);
  const count = useRef(state.players.length);
  useEffect(() => {
    if (state.players.length > count.current) sound.play("join");
    count.current = state.players.length;
  }, [state.players.length]);

  const copyLink = async () => {
    const link = `${window.location.origin}/room/${state.code}`;
    try {
      if (navigator.share && /Mobi/i.test(navigator.userAgent)) {
        await navigator.share({ title: "ChemVenture", text: `Jom main! Kod: ${state.code}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled share */
    }
  };

  let startHint = "Semua pemain sudah sedia!";
  if (state.players.length < MIN_PLAYERS) startHint = `Perlukan sekurang-kurangnya ${MIN_PLAYERS} pemain.`;
  else if (!state.players.every((p) => p.connected)) startHint = "Menunggu pemain yang terputus sambungan…";
  else if (!startable) startHint = `Menunggu semua pemain sedia (${readyCount}/${state.players.length}).`;

  return (
    <div className="lobby-grid">
      <section className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Pemain</h2>
          <span className="spacer" />
          <span className="muted small">
            {state.players.length}/{MAX_PLAYERS}
          </span>
        </div>
        <div className="players">
          {state.players.map((p) => (
            <div key={p.id} className={`player ${p.id === me.id ? "me" : ""} ${p.connected ? "" : "offline"}`}>
              <PlayerAvatar player={p} />
              <span className="player-name">
                {p.name}
                {p.id === me.id && <span className="muted small"> (anda)</span>}
              </span>
              {p.id === state.hostId && <span className="badge badge-host">Hos</span>}
              <span className="spacer" />
              {!p.connected ? (
                <span className="badge badge-off">Terputus</span>
              ) : p.ready ? (
                <span className="badge badge-ready">Sedia</span>
              ) : (
                <span className="badge badge-wait">Belum sedia</span>
              )}
              {isHost && p.id !== me.id && (
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => send({ type: "kick", playerId: p.id })}
                  title="Keluarkan pemain"
                  aria-label={`Keluarkan ${p.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: MAX_PLAYERS - state.players.length }, (_, i) => (
            <div key={`empty-${i}`} className="player empty">
              <div className="avatar" style={{ background: "transparent" }} />
              <span className="muted">Menunggu pemain…</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <div>
          <div className="muted small">Kongsi kod ini dengan rakan anda</div>
          <div className="row">
            <span className="room-code" style={{ fontSize: "2.2rem" }}>
              {state.code}
            </span>
            <button className="btn btn-ghost btn-small" onClick={copyLink}>
              {copied ? "Disalin!" : "Salin pautan"}
            </button>
          </div>
        </div>

        <button
          className={`btn btn-big ${me.ready ? "btn-ghost" : "btn-good"}`}
          onClick={() => send({ type: "setReady", ready: !me.ready })}
        >
          {me.ready ? "Batal sedia" : "Saya sedia!"}
        </button>

        {isHost ? (
          <>
            <button className="btn btn-primary btn-big" disabled={!startable} onClick={() => send({ type: "start" })}>
              Mula Permainan
            </button>
            <div className={startable ? "notice small" : "muted small"}>{startHint}</div>
          </>
        ) : (
          <div className="muted small">
            Menunggu hos memulakan permainan. {readyCount}/{state.players.length} pemain sedia.
          </div>
        )}

        <div className="muted small">
          Selepas permainan bermula, semua pemain membaling dadu untuk menentukan giliran. Skor tertinggi memilih
          karakter dahulu.
        </div>

        <button className="btn btn-ghost btn-small" onClick={onLeave} style={{ alignSelf: "flex-start" }}>
          Keluar bilik
        </button>
      </section>
    </div>
  );
}
