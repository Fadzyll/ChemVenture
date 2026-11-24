"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CODE_LENGTH, generateRoomCode, isValidRoomCode, normalizeRoomCode } from "@/shared/roomCode.ts";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => router.push(`/room/${generateRoomCode()}?create=1`);

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeRoomCode(code);
    if (!isValidRoomCode(c)) {
      setError(`Kod bilik mesti ${CODE_LENGTH} aksara.`);
      return;
    }
    router.push(`/room/${c}`);
  };

  return (
    <main className="page">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero" src="/img/hero.jpg" alt="ChemVenture: The Siege of Bonds" />

      <div className="landing-grid">
        <section className="panel stack">
          <h2>Cipta Bilik</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Jadi hos, kongsi kod dengan rakan (2–5 pemain), dan mulakan permainan apabila semua sedia.
          </p>
          <button className="btn btn-primary btn-big" onClick={createRoom}>
            Cipta Bilik
          </button>
        </section>

        <form className="panel stack" onSubmit={joinRoom}>
          <h2>Sertai Bilik</h2>
          <input
            className="input input-code"
            placeholder="KOD"
            value={code}
            maxLength={CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            aria-label="Kod bilik"
          />
          {error && <div className="alert small">{error}</div>}
          <button className="btn btn-pink btn-big" type="submit" disabled={!code.trim()}>
            Sertai
          </button>
        </form>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Cara Bermain</h2>
        <ol className="how-list">
          <li>Semua pemain membaling dadu untuk menentukan giliran. Skor tertinggi bermula dan memilih karakter dahulu. Jika seri, baling semula dan tambah skor.</li>
          <li>Semua pemain bermula di petak REAKSI dan menerima 1 koin duplet setiap kali melepasi petak ini.</li>
          <li>Ikut arahan pada petak yang dijejak: ION, KOVALEN, ASAS, DRUM, RADIKAL, GANGGUAN, NEUTRAL.</li>
          <li>Pemain yang kehabisan koin akan tersingkir.</li>
          <li>Selepas 20 minit, pemain dengan jumlah mata koin terbanyak menang.</li>
        </ol>
      </section>
    </main>
  );
}
