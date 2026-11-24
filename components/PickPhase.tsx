"use client";

import { CHARACTER_IDS, CHARACTERS } from "@/shared/characters.ts";
import { currentPicker } from "@/shared/rules.ts";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";
import { useLang } from "@/lib/i18n";
import PlayerAvatar from "./PlayerAvatar";

interface Props {
  state: RoomState;
  me: Player;
  send: (m: ClientMessage) => void;
}

export default function PickPhase({ state, me, send }: Props) {
  const { t, tr } = useLang();
  const pickerId = currentPicker(state);
  const picker = state.players.find((p) => p.id === pickerId) ?? null;
  const myTurn = pickerId === me.id;
  const isHost = state.hostId === me.id;
  const ownerOf = (id: string) => state.players.find((p) => p.character === id) ?? null;
  const ordered = state.turnOrder.map((id) => state.players.find((p) => p.id === id)!).filter(Boolean);

  return (
    <div className="stack">
      <div className="turn-banner">
        {myTurn ? (
          <>
            <strong>{t("Your turn!", "Giliran anda!")}</strong> {t("Pick your character.", "Pilih karakter anda.")}
          </>
        ) : (
          <>
            <strong>{picker?.name}</strong> {t("is picking a character…", "sedang memilih karakter…")}
          </>
        )}
        {isHost && picker && !picker.connected && (
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-small" onClick={() => send({ type: "actFor", playerId: picker.id })}>
              {picker.name} {t("is offline — pick automatically", "terputus — pilih secara automatik")}
            </button>
          </div>
        )}
      </div>

      <div className="char-grid">
        {CHARACTER_IDS.map((id) => {
          const c = CHARACTERS[id];
          const owner = ownerOf(id);
          const selectable = myTurn && !owner;
          return (
            <button
              key={id}
              type="button"
              className={`char-card ${selectable ? "selectable" : ""} ${owner ? "taken" : ""}`}
              disabled={!selectable}
              onClick={() => selectable && send({ type: "pickCharacter", character: id })}
              style={{ borderColor: owner ? c.color : undefined }}
            >
              {owner && <span className="char-owner">{owner.id === me.id ? t("You", "Anda") : owner.name}</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.name} />
              <span className="char-name">{c.name}</span>
              <span className="char-power">{tr({ en: c.powerEn, ms: c.power })}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small center" style={{ margin: 0 }}>
        {t("Each power can only be used twice per game.", "Setiap kuasa boleh digunakan sebanyak 2 kali sahaja sepanjang permainan.")}
      </p>

      <section className="panel">
        <h2>{t("Pick Order", "Turutan Memilih")}</h2>
        <div className="players">
          {ordered.map((p, i) => (
            <div key={p.id} className={`player ${p.id === me.id ? "me" : ""} ${p.id === pickerId ? "active" : ""}`}>
              <span className="order-num">{i + 1}</span>
              <PlayerAvatar player={p} />
              <span className="player-name">{p.name}</span>
              <span className="spacer" />
              <span className="muted small">
                {p.character ? CHARACTERS[p.character].name : p.id === pickerId ? t("Picking…", "Memilih…") : t("Waiting", "Menunggu")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
