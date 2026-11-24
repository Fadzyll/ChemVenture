"use client";

import { CHARACTERS } from "@/shared/characters.ts";
import { coinPoints } from "@/shared/config.ts";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import { useLang } from "@/lib/i18n";
import PlayerAvatar from "../PlayerAvatar";
import { PowerDots } from "./PowerCard";

export function Coins({ p }: { p: Player }) {
  return (
    <span className="coins" title="Singlet (1) · Duplet (2) · Oktet (8)">
      <span className="coin coin-s">{p.coins.singlet}</span>
      <span className="coin coin-d">{p.coins.duplet}</span>
      <span className="coin coin-o">{p.coins.oktet}</span>
    </span>
  );
}

export default function PlayerPanel({
  state,
  me,
  send,
}: {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
}) {
  const { t } = useLang();
  const currentId = state.game ? state.turnOrder[state.game.turnIndex] : null;
  const isHost = state.hostId === me.id;
  const stage = state.game?.stage;
  const ordered = state.turnOrder.map((id) => state.players.find((p) => p.id === id)!).filter(Boolean);

  return (
    <div className="players">
      {ordered.map((p) => {
        const c = p.character ? CHARACTERS[p.character] : null;
        const isCurrent = p.id === currentId && state.phase === "playing";
        const needsHelp =
          isHost &&
          !p.connected &&
          !p.eliminated &&
          (isCurrent || (stage?.kind === "drumQuestion" && !stage.answered.includes(p.id)));
        return (
          <div
            key={p.id}
            className={`player game-player ${p.id === me.id ? "me" : ""} ${isCurrent ? "active" : ""} ${p.eliminated || !p.connected ? "offline" : ""}`}
          >
            <PlayerAvatar player={p} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="player-name ellipsis">
                {p.name}
                {c && <span className="muted small"> · {c.name}</span>}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Coins p={p} />
                <strong className="points">{coinPoints(p.coins)} {t("pts", "mata")}</strong>
                <PowerDots left={p.powersLeft} />
              </div>
              <div className="row" style={{ gap: 4, marginTop: 4 }}>
                {isCurrent && <span className="badge badge-host">{t("Turn", "Giliran")}</span>}
                {p.skipTurns > 0 && <span className="badge badge-wait">{t("Resting", "Rehat")}</span>}
                {p.eliminated && <span className="badge badge-off">{t("Out", "Tersingkir")}</span>}
                {!p.connected && <span className="badge badge-off">{t("Offline", "Terputus")}</span>}
                {needsHelp && (
                  <button className="btn btn-ghost btn-small" onClick={() => send({ type: "actFor", playerId: p.id })}>
                    {t("Continue for them", "Teruskan untuknya")}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
