"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { tx } from "@/shared/i18n.ts";
import { CHARACTERS, POWER_USES } from "@/shared/characters.ts";
import { coinPoints } from "@/shared/config.ts";
import type { ClientMessage, Player, RoomState } from "@/shared/types.ts";

export function PowerDots({ left }: { left: number }) {
  const { t } = useLang();
  return (
    <span className="power-dots" aria-label={t(`${left} powers left`, `${left} kuasa tinggal`)}>
      {Array.from({ length: POWER_USES }, (_, i) => (
        <span key={i} className={`power-dot ${i < left ? "on" : ""}`} />
      ))}
    </span>
  );
}

const WHEN: Record<string, ReturnType<typeof tx>> = {
  oxyra: tx("On your turn, before rolling.", "Pada giliran anda, sebelum membaling dadu."),
  ghoston: tx("On your turn, before rolling.", "Pada giliran anda, sebelum membaling dadu."),
  mystra: tx("When you have to answer an ION/COVALENT card.", "Semasa anda perlu menjawab kad ION/KOVALEN."),
  quark: tx("Offered when you land on ION/COVALENT.", "Ditawarkan apabila anda menjejak petak ION/KOVALEN."),
  calco: tx("Offered when another player answers an ION/COVALENT card correctly.", "Ditawarkan apabila pemain lain menjawab kad ION/KOVALEN dengan betul."),
};

/** Your character's power, with a button whenever it can be used right now. */
export default function PowerCard({ state, me, send }: { state: RoomState; me: Player; send: (m: ClientMessage) => void }) {
  const [picking, setPicking] = useState(false);
  const { t, tr } = useLang();
  if (!me.character || me.eliminated) return null;
  const c = CHARACTERS[me.character];
  const g = state.game!;
  const stage = g.stage;
  const myTurn = state.turnOrder[g.turnIndex] === me.id;
  const hasUses = me.powersLeft > 0;

  let usable = false;
  let needsTarget = false;
  if (hasUses) {
    if ((c.id === "oxyra" || c.id === "ghoston") && myTurn && stage.kind === "roll") {
      usable = true;
      needsTarget = c.id === "ghoston";
    }
    if (c.id === "mystra" && stage.kind === "question" && stage.answererId === me.id && !stage.challengedBy && stage.question.deck !== "asas") {
      usable = true;
      needsTarget = true;
    }
  }

  const targets = state.players.filter(
    (p) =>
      p.id !== me.id &&
      !p.eliminated &&
      state.turnOrder.includes(p.id) &&
      (c.id !== "ghoston" || coinPoints(p.coins) > 0),
  );

  const use = (targetId?: string) => {
    send({ type: "usePower", targetId });
    setPicking(false);
  };

  return (
    <div className="power-card" style={{ borderColor: c.color }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.image} alt={c.name} className="power-img" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <strong>{t(`${c.name}'s power`, `Kuasa ${c.name}`)}</strong>
          <PowerDots left={me.powersLeft} />
        </div>
        <div className="small">{tr({ en: c.powerEn, ms: c.power })}</div>
        <div className="small muted">{hasUses ? tr(WHEN[c.id]) : t("Power used up.", "Kuasa sudah habis digunakan.")}</div>
        {usable && !picking && (
          <button
            className="btn btn-pink btn-small"
            style={{ marginTop: 8 }}
            onClick={() => (needsTarget ? setPicking(true) : use())}
          >
            {t(`Use power (${me.powersLeft} left)`, `Guna kuasa (${me.powersLeft} lagi)`)}
          </button>
        )}
        {usable && picking && (
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <span className="small">{c.id === "ghoston" ? t("Take from:", "Ambil daripada:") : t("Challenge:", "Cabar:")}</span>
            {targets.map((target) => (
              <button key={target.id} className="btn btn-pink btn-small" onClick={() => use(target.id)}>
                {target.name}
              </button>
            ))}
            <button className="btn btn-ghost btn-small" onClick={() => setPicking(false)}>
              {t("Cancel", "Batal")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
