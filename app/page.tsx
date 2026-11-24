"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import CodeInput from "@/components/CodeInput";
import SoundControls from "@/components/SoundControls";
import { LangToggle, useLang } from "@/lib/i18n";
import { CHARACTER_IDS, CHARACTERS } from "@/shared/characters.ts";
import { GAME_MINUTES } from "@/shared/config.ts";
import { tx } from "@/shared/i18n.ts";
import { CODE_LENGTH, generateRoomCode, isValidRoomCode } from "@/shared/roomCode.ts";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/types.ts";

const CHIPS = [
  { t: "Na⁺", c: "#ff8a1f", x: "4%", y: "12%", d: "0s" },
  { t: "Cl⁻", c: "#22c55e", x: "84%", y: "6%", d: "1.2s" },
  { t: "H₂O", c: "#3b82f6", x: "88%", y: "70%", d: "0.6s" },
  { t: "e⁻", c: "#ffd21f", x: "-2%", y: "68%", d: "1.8s" },
  { t: "Mg²⁺", c: "#e94fc3", x: "40%", y: "-6%", d: "2.4s" },
  { t: "CO₂", c: "#a78bfa", x: "52%", y: "92%", d: "0.9s" },
];

const STEPS = [
  {
    title: tx("Create or join a room", "Cipta atau sertai bilik"),
    text: tx(
      "The host creates a room and shares the 5-letter code. Friends enter a name and press Ready.",
      "Hos mencipta bilik dan berkongsi kod 5 aksara. Rakan masukkan nama dan tekan Sedia.",
    ),
  },
  {
    title: tx("Roll for turn order", "Baling untuk giliran"),
    text: tx(
      "The highest roll goes first and picks a character first. Ties roll again and add to their score.",
      "Skor tertinggi bermula dan memilih karakter dahulu. Jika seri, baling semula dan tambah skor.",
    ),
  },
  {
    title: tx("Move & answer", "Gerak & jawab"),
    text: tx(
      "Start on REACTION. Follow each square: answer ionic, covalent and basic questions to collect coins.",
      "Bermula di REAKSI. Ikut arahan petak: jawab soalan ion, kovalen dan asas untuk kumpul koin.",
    ),
  },
  {
    title: tx("Use your power", "Guna kuasa"),
    text: tx(
      "Every character has a special power — but it can only be used twice per game.",
      "Setiap karakter ada kuasa istimewa — boleh digunakan 2 kali sahaja sepanjang permainan.",
    ),
  },
  {
    title: tx("Collect points", "Kumpul mata"),
    text: tx(
      `Run out of coins and you're out. After ${GAME_MINUTES} minutes, the most coin points wins!`,
      `Kehabisan koin = tersingkir. Selepas ${GAME_MINUTES} minit, mata koin tertinggi menang!`,
    ),
  },
];

const SQUARES = [
  { icon: "⚡", name: tx("ION", "ION"), color: "#ff8a1f", text: tx("Answer one ionic bond question.", "Jawab satu soalan ikatan ion.") },
  { icon: "🧪", name: tx("COVALENT", "KOVALEN"), color: "#ffd21f", text: tx("Answer one covalent bond question.", "Jawab satu soalan ikatan kovalen.") },
  { icon: "🔍", name: tx("BASICS", "ASAS"), color: "#22a855", text: tx("Answer one basic ionic or covalent question.", "Jawab satu soalan asas ion atau kovalen.") },
  { icon: "🥁", name: tx("DRUM", "DRUM"), color: "#ef3b2d", text: tx("A reward, a penalty, or a question for everyone.", "Ganjaran, hukuman, atau soalan untuk semua pemain.") },
  { icon: "🎬", name: tx("REACTION", "REAKSI"), color: "#f4f1ff", text: tx("Starting square. +1 duplet coin every time you pass it.", "Petak permulaan. +1 koin duplet setiap kali melepasinya.") },
  { icon: "💥", name: tx("RADICAL", "RADIKAL"), color: "#2bb3ff", text: tx("Sit out one round, or pay to leave.", "Rehat satu pusingan, atau bayar untuk keluar.") },
  { icon: "☢️", name: tx("DISRUPTION", "GANGGUAN"), color: "#84cc16", text: tx("Go to RADICAL, or pay to stay.", "Pergi ke RADIKAL, atau bayar untuk kekal.") },
  { icon: "✴️", name: tx("NEUTRAL", "NEUTRAL"), color: "#ffd84d", text: tx("No question or reward — just visiting.", "Tiada soalan atau ganjaran — singgah sahaja.") },
];

export default function Landing() {
  const router = useRouter();
  const { t, tr } = useLang();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const joinBtn = useRef<HTMLButtonElement>(null);

  const createRoom = () => router.push(`/room/${generateRoomCode()}?create=1`);
  const joinRoom = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidRoomCode(code)) {
      setError(t(`Enter the ${CODE_LENGTH}-letter code.`, `Masukkan kod ${CODE_LENGTH} aksara.`));
      return;
    }
    router.push(`/room/${code}`);
  };

  return (
    <div className="lp">
      <div className="lp-stars" aria-hidden />

      <nav className="lp-nav">
        <a href="#" className="lp-brand" aria-label="ChemVenture">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.jpg" alt="" />
          <span>ChemVenture</span>
        </a>
        <div className="lp-nav-links">
          <a href="#karakter">{t("Characters", "Karakter")}</a>
          <a href="#cara">{t("How to play", "Cara bermain")}</a>
          <a href="#petak">{t("Squares", "Petak")}</a>
        </div>
        <div className="top-controls lp-nav-controls">
          <LangToggle />
          <SoundControls />
        </div>
      </nav>

      {/* ---------------- hero ---------------- */}
      <header className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">
            <span className="lp-dot" /> {t("Chemistry board game", "Permainan papan kimia")} · {MIN_PLAYERS}–{MAX_PLAYERS}{" "}
            {t("players", "pemain")}
          </span>
          <h1 className="lp-title">
            <span>CHEMVENTURE</span>
            <small>The Siege of Bonds</small>
          </h1>
          <p className="lp-lead">
            {t("Roll the dice, master ", "Baling dadu, kuasai ")}
            <b>{t("ionic bonds", "ikatan ion")}</b>
            {t(" and ", " dan ")}
            <b>{t("covalent bonds", "ikatan kovalen")}</b>
            {t(
              ", and collect the most coins with your friends — right in your browser, on a phone or computer.",
              ", dan kumpul koin paling banyak bersama rakan — terus dari pelayar, di telefon atau komputer.",
            )}
          </p>

          <div className="lp-actions">
            <button className="btn btn-primary btn-big lp-create" onClick={createRoom}>
              <span aria-hidden>✨</span> {t("Create Room", "Cipta Bilik")}
            </button>
            <div className="lp-or">
              <span>{t("or join with a code", "atau sertai dengan kod")}</span>
            </div>
            <form className="lp-join" onSubmit={joinRoom}>
              <CodeInput
                value={code}
                invalid={!!error}
                onChange={(v) => {
                  setCode(v);
                  setError("");
                }}
                onComplete={() => joinBtn.current?.focus()}
              />
              <button ref={joinBtn} className="btn btn-pink btn-big" type="submit" disabled={code.length < CODE_LENGTH}>
                {t("Join →", "Sertai →")}
              </button>
            </form>
            {error && <div className="alert small">{error}</div>}
            <p className="lp-note">{t("No account needed · Free · 3D board", "Tiada akaun diperlukan · Percuma · Papan 3D")}</p>
          </div>
        </div>

        <div className="lp-hero-art">
          <div className="lp-orbit" aria-hidden>
            <span />
            <span />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lp-hero-img" src="/img/hero.jpg" alt="ChemVenture: The Siege of Bonds" />
          {CHIPS.map((c) => (
            <span key={c.t} className="lp-chip" style={{ left: c.x, top: c.y, animationDelay: c.d, borderColor: c.c, color: c.c }} aria-hidden>
              {c.t}
            </span>
          ))}
        </div>
      </header>

      {/* ---------------- stats ---------------- */}
      <section className="lp-stats" aria-label={t("Summary", "Ringkasan")}>
        <div>
          <strong>
            {MIN_PLAYERS}–{MAX_PLAYERS}
          </strong>
          <span>{t("players at once", "pemain serentak")}</span>
        </div>
        <div>
          <strong>{GAME_MINUTES}</strong>
          <span>{t("minutes per game", "minit setiap permainan")}</span>
        </div>
        <div>
          <strong>5</strong>
          <span>{t("characters with powers", "karakter berkuasa")}</span>
        </div>
        <div>
          <strong>46</strong>
          <span>{t("question & drum cards", "kad soalan & drum")}</span>
        </div>
      </section>

      {/* ---------------- characters ---------------- */}
      <section className="lp-section" id="karakter">
        <div className="lp-section-head">
          <span className="lp-kicker">{t("Characters", "Karakter")}</span>
          <h2>{t("Choose your hero", "Pilih wira anda")}</h2>
          <p>
            {t(
              "Each character has one special power that can turn the game — use it wisely, only twice!",
              "Setiap karakter ada satu kuasa istimewa yang boleh mengubah permainan — gunakan dengan bijak, hanya 2 kali!",
            )}
          </p>
        </div>
        <div className="lp-chars">
          {CHARACTER_IDS.map((id) => {
            const c = CHARACTERS[id];
            return (
              <article key={id} className="lp-char" style={{ "--c": c.color } as React.CSSProperties}>
                <div className="lp-char-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt={c.name} loading="lazy" />
                </div>
                <h3>{c.name}</h3>
                <p>{tr({ en: c.powerEn, ms: c.power })}</p>
                <span className="lp-char-uses">⚡ ×2</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------------- how to play ---------------- */}
      <section className="lp-section" id="cara">
        <div className="lp-section-head">
          <span className="lp-kicker">{t("How to play", "Cara bermain")}</span>
          <h2>{t("Five steps to victory", "Lima langkah ke kemenangan")}</h2>
        </div>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={i}>
              <span className="lp-step-num">{i + 1}</span>
              <h3>{tr(s.title)}</h3>
              <p>{tr(s.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- squares ---------------- */}
      <section className="lp-section" id="petak">
        <div className="lp-section-head">
          <span className="lp-kicker">{t("Squares", "Petak")}</span>
          <h2>{t("Know the board", "Kenali papan")}</h2>
          <p>{t("22 squares, 8 types. Follow the square you land on.", "22 petak, 8 jenis. Ikut arahan petak yang anda jejak.")}</p>
        </div>
        <div className="lp-squares">
          {SQUARES.map((s) => (
            <div key={s.name.en} className="lp-square" style={{ "--c": s.color } as React.CSSProperties}>
              <span className="lp-square-icon" aria-hidden>
                {s.icon}
              </span>
              <div>
                <strong>{tr(s.name)}</strong>
                <p>{tr(s.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- final CTA ---------------- */}
      <section className="lp-cta">
        <h2>{t("Ready to battle with bonds?", "Sedia untuk bertarung dengan ikatan?")}</h2>
        <p>{t("Create a room in one click and share the code with your classmates.", "Cipta bilik dalam satu klik dan kongsi kod dengan rakan sekelas anda.")}</p>
        <button className="btn btn-primary btn-big" onClick={createRoom}>
          ✨ {t("Create a Room Now", "Cipta Bilik Sekarang")}
        </button>
      </section>

      <footer className="lp-footer">
        ChemVenture: The Siege of Bonds · {t("Ionic & Covalent Bonds", "Ikatan Ion & Kovalen")}
      </footer>
    </div>
  );
}
