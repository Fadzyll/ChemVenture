import { CHARACTERS } from "@/shared/characters.ts";
import type { Player, RoomState } from "@/shared/types.ts";
import PlayerAvatar from "./PlayerAvatar";

/** Placeholder shown once characters are picked. The 3D board replaces this in Phase 3–5. */
export default function GameReady({ state, me }: { state: RoomState; me: Player }) {
  const ordered = state.turnOrder.map((id) => state.players.find((p) => p.id === id)!).filter(Boolean);
  return (
    <div className="stack">
      <div className="turn-banner">
        Semua karakter telah dipilih. <strong>{ordered[0]?.name}</strong> bermula di petak REAKSI!
      </div>
      <section className="panel">
        <h2>Turutan Giliran</h2>
        <div className="players">
          {ordered.map((p, i) => {
            const c = p.character ? CHARACTERS[p.character] : null;
            return (
              <div key={p.id} className={`player ${p.id === me.id ? "me" : ""} ${p.connected ? "" : "offline"}`}>
                <span className="order-num">{i + 1}</span>
                <PlayerAvatar player={p} />
                <div>
                  <div className="player-name">
                    {p.name} {c && <span className="muted">· {c.name}</span>}
                  </div>
                  {c && <div className="small muted">{c.power}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="notice center">Papan permainan 3D akan datang dalam Fasa 3.</div>
    </div>
  );
}
