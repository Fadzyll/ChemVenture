"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import CodeInput from "@/components/CodeInput";
import SoundControls from "@/components/SoundControls";
import { CHARACTER_IDS, CHARACTERS } from "@/shared/characters.ts";
import { GAME_MINUTES } from "@/shared/config.ts";
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
  { title: "Cipta atau sertai bilik", text: "Hos mencipta bilik dan berkongsi kod 5 aksara. Rakan masukkan nama dan tekan Sedia." },
  { title: "Baling untuk giliran", text: "Skor tertinggi bermula dan memilih karakter dahulu. Jika seri, baling semula dan tambah skor." },
  { title: "Gerak & jawab", text: "Bermula di REAKSI. Ikut arahan petak: jawab soalan ion, kovalen dan asas untuk kumpul koin." },
  { title: "Guna kuasa", text: "Setiap karakter ada kuasa istimewa — boleh digunakan 2 kali sahaja sepanjang permainan." },
  { title: "Kumpul mata", text: `Kehabisan koin = tersingkir. Selepas ${GAME_MINUTES} minit, mata koin tertinggi menang!` },
];

const SQUARES = [
  { icon: "⚡", name: "ION", color: "#ff8a1f", text: "Jawab satu soalan ikatan ion." },
  { icon: "🧪", name: "KOVALEN", color: "#ffd21f", text: "Jawab satu soalan ikatan kovalen." },
  { icon: "🔍", name: "ASAS", color: "#22a855", text: "Jawab satu soalan asas ion atau kovalen." },
  { icon: "🥁", name: "DRUM", color: "#ef3b2d", text: "Ganjaran, hukuman, atau soalan untuk semua pemain." },
  { icon: "🎬", name: "REAKSI", color: "#f4f1ff", text: "Petak permulaan. +1 koin duplet setiap kali melepasinya." },
  { icon: "💥", name: "RADIKAL", color: "#2bb3ff", text: "Rehat satu pusingan, atau bayar untuk keluar." },
  { icon: "☢️", name: "GANGGUAN", color: "#84cc16", text: "Pergi ke RADIKAL, atau bayar untuk kekal." },
  { icon: "✴️", name: "NEUTRAL", color: "#ffd84d", text: "Tiada soalan atau ganjaran — singgah sahaja." },
];

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const joinBtn = useRef<HTMLButtonElement>(null);

  const createRoom = () => router.push(`/room/${generateRoomCode()}?create=1`);
  const joinRoom = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidRoomCode(code)) {
      setError(`Masukkan kod ${CODE_LENGTH} aksara.`);
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
          <a href="#karakter">Karakter</a>
          <a href="#cara">Cara bermain</a>
          <a href="#petak">Petak</a>
        </div>
        <SoundControls />
      </nav>

      {/* ---------------- hero ---------------- */}
      <header className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">
            <span className="lp-dot" /> Permainan papan kimia · {MIN_PLAYERS}–{MAX_PLAYERS} pemain
          </span>
          <h1 className="lp-title">
            <span>CHEMVENTURE</span>
            <small>The Siege of Bonds</small>
          </h1>
          <p className="lp-lead">
            Baling dadu, kuasai <b>ikatan ion</b> dan <b>ikatan kovalen</b>, dan kumpul koin paling banyak bersama
            rakan — terus dari pelayar, di telefon atau komputer.
          </p>

          <div className="lp-actions">
            <button className="btn btn-primary btn-big lp-create" onClick={createRoom}>
              <span aria-hidden>✨</span> Cipta Bilik
            </button>
            <div className="lp-or">
              <span>atau sertai dengan kod</span>
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
                Sertai →
              </button>
            </form>
            {error && <div className="alert small">{error}</div>}
            <p className="lp-note">Tiada akaun diperlukan · Percuma · Papan 3D</p>
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
      <section className="lp-stats" aria-label="Ringkasan">
        <div>
          <strong>
            {MIN_PLAYERS}–{MAX_PLAYERS}
          </strong>
          <span>pemain serentak</span>
        </div>
        <div>
          <strong>{GAME_MINUTES}</strong>
          <span>minit setiap permainan</span>
        </div>
        <div>
          <strong>5</strong>
          <span>karakter berkuasa</span>
        </div>
        <div>
          <strong>46</strong>
          <span>kad soalan & drum</span>
        </div>
      </section>

      {/* ---------------- characters ---------------- */}
      <section className="lp-section" id="karakter">
        <div className="lp-section-head">
          <span className="lp-kicker">Karakter</span>
          <h2>Pilih wira anda</h2>
          <p>Setiap karakter ada satu kuasa istimewa yang boleh mengubah permainan — gunakan dengan bijak, hanya 2 kali!</p>
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
                <p>{c.power}</p>
                <span className="lp-char-uses">⚡ ×2</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------------- how to play ---------------- */}
      <section className="lp-section" id="cara">
        <div className="lp-section-head">
          <span className="lp-kicker">Cara bermain</span>
          <h2>Lima langkah ke kemenangan</h2>
        </div>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="lp-step-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- squares ---------------- */}
      <section className="lp-section" id="petak">
        <div className="lp-section-head">
          <span className="lp-kicker">Petak</span>
          <h2>Kenali papan</h2>
          <p>22 petak, 8 jenis. Ikut arahan petak yang anda jejak.</p>
        </div>
        <div className="lp-squares">
          {SQUARES.map((s) => (
            <div key={s.name} className="lp-square" style={{ "--c": s.color } as React.CSSProperties}>
              <span className="lp-square-icon" aria-hidden>
                {s.icon}
              </span>
              <div>
                <strong>{s.name}</strong>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- final CTA ---------------- */}
      <section className="lp-cta">
        <h2>Sedia untuk bertarung dengan ikatan?</h2>
        <p>Cipta bilik dalam satu klik dan kongsi kod dengan rakan sekelas anda.</p>
        <button className="btn btn-primary btn-big" onClick={createRoom}>
          ✨ Cipta Bilik Sekarang
        </button>
      </section>

      <footer className="lp-footer">ChemVenture: The Siege of Bonds · Ikatan Ion &amp; Kovalen</footer>
    </div>
  );
}
