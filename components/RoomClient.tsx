"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { generateRoomCode } from "@/shared/roomCode.ts";
import { MAX_PLAYERS, NAME_MAX_LENGTH, type ErrorCode, type GameEvent, type Phase } from "@/shared/types.ts";
import { clearJoined, getJoinedName, getSavedName, saveName, setJoinedName } from "@/lib/identity";
import { useRoom } from "@/lib/useRoom";
import GameReady from "./GameReady";
import Lobby from "./Lobby";
import PickPhase from "./PickPhase";
import RollPhase, { type LastRoll } from "./RollPhase";

/** Errors that mean "you are not getting into this room". */
const FATAL: ErrorCode[] = ["ROOM_NOT_FOUND", "GAME_STARTED", "ROOM_FULL"];
/** Errors that send you back to the name form. */
const NAME_ERRORS: ErrorCode[] = ["NAME_TAKEN", "NAME_INVALID"];
/** Keep the roll results on screen for a moment before moving to character pick. */
const RESULT_HOLD_MS = 2600;

const PHASE_LABEL: Record<Phase, string> = {
  lobby: "Lobi",
  rolling: "Baling dadu",
  picking: "Pilih karakter",
  playing: "Permainan",
};

export default function RoomClient({ code, isCreating }: { code: string; isCreating: boolean }) {
  const router = useRouter();
  const [lastRoll, setLastRoll] = useState<LastRoll | null>(null);
  const [holdResults, setHoldResults] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEvent = (e: GameEvent) => {
    if (e.type === "rolled") setLastRoll({ playerId: e.playerId, value: e.value, key: Date.now() });
    if (e.type === "turnOrderDecided") {
      setHoldResults(true);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => setHoldResults(false), RESULT_HOLD_MS);
    }
  };

  const room = useRoom(code, onEvent);
  const { state, me, status, error } = room;

  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // On mount: prefill the name, and re-join automatically after a refresh.
  useEffect(() => {
    setName(getSavedName());
    const joined = getJoinedName(code);
    if (joined) {
      room.enter(joined, isCreating ? "create" : "join");
      setSubmitted(true);
    }
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Once we're in the room: remember it, and clean "?create=1" out of the URL so the link is shareable.
  useEffect(() => {
    if (!me) return;
    setJoinedName(code, me.name);
    saveName(me.name);
    if (isCreating) window.history.replaceState(null, "", `/room/${code}`);
  }, [me, code, isCreating]);

  // React to server errors.
  useEffect(() => {
    if (!error) return;
    if (error.code === "ROOM_EXISTS" && isCreating && !me) {
      // Someone already owns this code: quietly try a fresh one.
      const next = generateRoomCode();
      setJoinedName(next, name.trim());
      clearJoined(code);
      router.replace(`/room/${next}?create=1`);
      return;
    }
    if (FATAL.includes(error.code) && !me) {
      room.forget();
      clearJoined(code);
      setSubmitted(false);
      setFatal(error.message);
      return;
    }
    if (NAME_ERRORS.includes(error.code) && !me) {
      room.forget();
      clearJoined(code);
      setSubmitted(false);
      setToast(error.message);
      return;
    }
    setToast(error.message);
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setToast(null);
    setSubmitted(true);
    room.enter(n, isCreating ? "create" : "join");
  };

  const leave = () => {
    room.send({ type: "leave" });
    room.forget();
    clearJoined(code);
    router.push("/");
  };

  // ---------- screens that end here ----------
  if (status === "kicked" || status === "replaced") {
    return (
      <Shell code={code}>
        <div className="panel stack center">
          <h2>{status === "kicked" ? "Anda telah dikeluarkan oleh hos." : "Bilik ini dibuka dalam tab lain."}</h2>
          <Link className="btn btn-primary" href="/">
            Kembali ke laman utama
          </Link>
        </div>
      </Shell>
    );
  }

  if (fatal) {
    return (
      <Shell code={code}>
        <div className="panel stack center">
          <h2>{fatal}</h2>
          <Link className="btn btn-primary" href="/">
            Kembali ke laman utama
          </Link>
        </div>
      </Shell>
    );
  }

  // ---------- name entry ----------
  if (!me) {
    const roomGone = state && !state.created && !isCreating;
    const started = state && state.created && state.phase !== "lobby";
    const full = state && state.phase === "lobby" && state.players.length >= MAX_PLAYERS;
    return (
      <Shell code={code} connected={status === "open"}>
        <form className="panel stack" onSubmit={submitName} style={{ maxWidth: 440, margin: "0 auto" }}>
          <h2>{isCreating ? "Cipta bilik baharu" : `Sertai bilik ${code}`}</h2>
          {roomGone && !submitted && <div className="alert small">Bilik ini belum wujud. Semak kod anda.</div>}
          {started && !submitted && <div className="alert small">Permainan dalam bilik ini sudah bermula.</div>}
          {full && !submitted && <div className="alert small">Bilik ini sudah penuh.</div>}
          {toast && <div className="alert small">{toast}</div>}
          <label className="muted small" htmlFor="name">
            Nama anda
          </label>
          <input
            id="name"
            className="input"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            autoFocus
            autoComplete="nickname"
            placeholder="cth. Aisyah"
            onChange={(e) => setName(e.target.value)}
            disabled={submitted}
          />
          <button className="btn btn-primary btn-big" type="submit" disabled={!name.trim() || submitted}>
            {submitted ? "Menyambung…" : isCreating ? "Cipta & Masuk" : "Masuk"}
          </button>
          <Link href="/" className="small center">
            Kembali
          </Link>
        </form>
      </Shell>
    );
  }

  // ---------- in the room ----------
  const showRollResults = state!.phase === "rolling" || (state!.phase === "picking" && holdResults);
  return (
    <Shell code={code} phase={state!.phase} connected={status === "open"}>
      {toast && (
        <div className="alert small" style={{ marginBottom: 12 }}>
          {toast}
        </div>
      )}
      {status !== "open" && (
        <div className="notice small" style={{ marginBottom: 12 }}>
          Sambungan terputus — cuba menyambung semula…
        </div>
      )}
      {state!.phase === "lobby" && <Lobby state={state!} me={me} send={room.send} onLeave={leave} />}
      {showRollResults && <RollPhase state={state!} me={me} send={room.send} lastRoll={lastRoll} />}
      {state!.phase === "picking" && !holdResults && <PickPhase state={state!} me={me} send={room.send} />}
      {state!.phase === "playing" && <GameReady state={state!} me={me} />}
    </Shell>
  );
}

function Shell({
  code,
  phase,
  connected,
  children,
}: {
  code: string;
  phase?: Phase;
  connected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="page">
      <header className="room-header">
        <Link href="/" aria-label="Laman utama">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="room-logo" src="/img/logo.jpg" alt="ChemVenture" />
        </Link>
        <div>
          <div className="muted small">Bilik</div>
          <div className="room-code">{code}</div>
        </div>
        <span className="spacer" />
        {phase && <span className="phase-tag">{PHASE_LABEL[phase]}</span>}
        {connected !== undefined && (
          <span className={`conn-dot ${connected ? "" : "off"}`} title={connected ? "Bersambung" : "Terputus"} />
        )}
      </header>
      {children}
    </main>
  );
}
