"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
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
  const { t } = useLang();
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
        await navigator.share({ title: "ChemVenture", text: t(`Let's play! Code: ${state.code}`, `Jom main! Kod: ${state.code}`), url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled share */
    }
  };

  let startHint = t("Everyone is ready!", "Semua pemain sudah sedia!");
  if (state.players.length < MIN_PLAYERS) startHint = t(`Needs at least ${MIN_PLAYERS} players.`, `Perlukan sekurang-kurangnya ${MIN_PLAYERS} pemain.`);
  else if (!state.players.every((p) => p.connected)) startHint = t("Waiting for disconnected players…", "Menunggu pemain yang terputus sambungan…");
  else if (!startable) startHint = t(`Waiting for everyone to be ready (${readyCount}/${state.players.length}).`, `Menunggu semua pemain sedia (${readyCount}/${state.players.length}).`);

  return (
    <div className="lobby-grid">
      <section className="panel">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{t("Players", "Pemain")}</h2>
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
                {p.id === me.id && <span className="muted small"> {t("(you)", "(anda)")}</span>}
              </span>
              {p.id === state.hostId && <span className="badge badge-host">{t("Host", "Hos")}</span>}
              <span className="spacer" />
              {!p.connected ? (
                <span className="badge badge-off">{t("Offline", "Terputus")}</span>
              ) : p.ready ? (
                <span className="badge badge-ready">{t("Ready", "Sedia")}</span>
              ) : (
                <span className="badge badge-wait">{t("Not ready", "Belum sedia")}</span>
              )}
              {isHost && p.id !== me.id && (
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => send({ type: "kick", playerId: p.id })}
                  title={t("Remove player", "Keluarkan pemain")}
                  aria-label={t(`Remove ${p.name}`, `Keluarkan ${p.name}`)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: MAX_PLAYERS - state.players.length }, (_, i) => (
            <div key={`empty-${i}`} className="player empty">
              <div className="avatar" style={{ background: "transparent" }} />
              <span className="muted">{t("Waiting for a player…", "Menunggu pemain…")}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <div>
          <div className="muted small">{t("Share this code with your friends", "Kongsi kod ini dengan rakan anda")}</div>
          <div className="row">
            <span className="room-code" style={{ fontSize: "2.2rem" }}>
              {state.code}
            </span>
            <button className="btn btn-ghost btn-small" onClick={copyLink}>
              {copied ? t("Copied!", "Disalin!") : t("Copy link", "Salin pautan")}
            </button>
          </div>
        </div>

        <button
          className={`btn btn-big ${me.ready ? "btn-ghost" : "btn-good"}`}
          onClick={() => send({ type: "setReady", ready: !me.ready })}
        >
          {me.ready ? t("Not ready", "Batal sedia") : t("I'm ready!", "Saya sedia!")}
        </button>

        {isHost ? (
          <>
            <button className="btn btn-primary btn-big" disabled={!startable} onClick={() => send({ type: "start" })}>
              {t("Start Game", "Mula Permainan")}
            </button>
            <div className={startable ? "notice small" : "muted small"}>{startHint}</div>
          </>
        ) : (
          <div className="muted small">
            {t(
              `Waiting for the host to start. ${readyCount}/${state.players.length} players ready.`,
              `Menunggu hos memulakan permainan. ${readyCount}/${state.players.length} pemain sedia.`,
            )}
          </div>
        )}

        <div className="muted small">
          {t(
            "When the game starts, everyone rolls the dice to decide turn order. The highest roll picks a character first.",
            "Selepas permainan bermula, semua pemain membaling dadu untuk menentukan giliran. Skor tertinggi memilih karakter dahulu.",
          )}
        </div>

        <button className="btn btn-ghost btn-small" onClick={onLeave} style={{ alignSelf: "flex-start" }}>
          {t("Leave room", "Keluar bilik")}
        </button>
      </section>
    </div>
  );
}
