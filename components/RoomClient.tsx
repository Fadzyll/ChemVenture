"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { join, tx, type Text } from "@/shared/i18n.ts";
import { generateRoomCode } from "@/shared/roomCode.ts";
import { MAX_PLAYERS, NAME_MAX_LENGTH, type ErrorCode, type GameEvent, type Phase } from "@/shared/types.ts";
import { clearJoined, getJoinedName, getSavedName, saveName, setJoinedName } from "@/lib/identity";
import { LangToggle, useLang } from "@/lib/i18n";
import { sound } from "@/lib/sound";
import { useRoom } from "@/lib/useRoom";
import SoundControls from "./SoundControls";
import type { MoveAnim } from "./game/Board";
import GameOver from "./game/GameOver";
import GameView, { type RollAnim } from "./game/GameView";
import Lobby from "./Lobby";
import PickPhase from "./PickPhase";
import RollPhase, { type LastRoll } from "./RollPhase";

/** Errors that mean "you are not getting into this room". */
const FATAL: ErrorCode[] = ["ROOM_NOT_FOUND", "GAME_STARTED", "ROOM_FULL"];
/** Errors that send you back to the name form. */
const NAME_ERRORS: ErrorCode[] = ["NAME_TAKEN", "NAME_INVALID"];
/** Keep the roll results on screen for a moment before moving to character pick. */
const RESULT_HOLD_MS = 2600;

const PHASE_LABEL: Record<Phase, Text> = {
  lobby: tx("Lobby", "Lobi"),
  rolling: tx("Rolling", "Baling dadu"),
  picking: tx("Pick character", "Pilih karakter"),
  playing: tx("Playing", "Permainan"),
  ended: tx("Finished", "Tamat"),
};

export default function RoomClient({ code, isCreating }: { code: string; isCreating: boolean }) {
  const router = useRouter();
  const { t, tr } = useLang();
  const [lastRoll, setLastRoll] = useState<LastRoll | null>(null);
  const [holdResults, setHoldResults] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [move, setMove] = useState<MoveAnim | null>(null);
  const [boardRoll, setBoardRoll] = useState<RollAnim | null>(null);
  const [drumText, setDrumText] = useState<Text | null>(null);
  const drumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEvent = (e: GameEvent) => {
    // sound effects
    if (e.type === "rolled" || (e.type === "moved" && e.roll > 0)) sound.play("dice");
    if (e.type === "drumCard") sound.play("drum");
    if (e.type === "power") sound.play("power");
    if (e.type === "eliminated") sound.play("eliminated");
    if (e.type === "turnOrderDecided") setTimeout(() => sound.play("fanfare"), 900);
    if (e.type === "picked") sound.play("join");

    if (e.type === "rolled") setLastRoll({ playerId: e.playerId, value: e.value, key: Date.now() });
    if (e.type === "moved") {
      const key = Date.now();
      if (e.roll > 0) setBoardRoll({ value: e.roll, key });
      setMove({ playerId: e.playerId, from: e.from, to: e.to, key });
    }
    if (e.type === "drumCard" || e.type === "power") {
      setDrumText(join([e.type === "drumCard" ? "DRUM: " : "⚡ ", e.text]));
      if (drumTimer.current) clearTimeout(drumTimer.current);
      drumTimer.current = setTimeout(() => setDrumText(null), 8000);
    }
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
  const [fatal, setFatal] = useState<Text | null>(null);
  const [toast, setToast] = useState<Text | null>(null);

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
      if (drumTimer.current) clearTimeout(drumTimer.current);
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
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
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
          <h2>
            {status === "kicked"
              ? t("You were removed by the host.", "Anda telah dikeluarkan oleh hos.")
              : t("This room is open in another tab.", "Bilik ini dibuka dalam tab lain.")}
          </h2>
          <Link className="btn btn-primary" href="/">
            {t("Back to home", "Kembali ke laman utama")}
          </Link>
        </div>
      </Shell>
    );
  }

  if (fatal) {
    return (
      <Shell code={code}>
        <div className="panel stack center">
          <h2>{tr(fatal)}</h2>
          <Link className="btn btn-primary" href="/">
            {t("Back to home", "Kembali ke laman utama")}
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
        {room.unavailable && <ServerUnavailable onRetry={room.retry} />}
        <form className="panel stack" onSubmit={submitName} style={{ maxWidth: 440, margin: "0 auto" }}>
          <h2>{isCreating ? t("Create a new room", "Cipta bilik baharu") : t(`Join room ${code}`, `Sertai bilik ${code}`)}</h2>
          {roomGone && !submitted && (
            <div className="alert small">{t("This room doesn't exist yet. Check your code.", "Bilik ini belum wujud. Semak kod anda.")}</div>
          )}
          {started && !submitted && (
            <div className="alert small">{t("The game in this room has already started.", "Permainan dalam bilik ini sudah bermula.")}</div>
          )}
          {full && !submitted && <div className="alert small">{t("This room is full.", "Bilik ini sudah penuh.")}</div>}
          {toast && <div className="alert small">{tr(toast)}</div>}
          <label className="muted small" htmlFor="name">
            {t("Your name", "Nama anda")}
          </label>
          <input
            id="name"
            className="input"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            autoFocus
            autoComplete="nickname"
            placeholder={t("e.g. Aisyah", "cth. Aisyah")}
            onChange={(e) => setName(e.target.value)}
            disabled={submitted}
          />
          <button className="btn btn-primary btn-big" type="submit" disabled={!name.trim() || submitted}>
            {submitted ? t("Connecting…", "Menyambung…") : isCreating ? t("Create & Enter", "Cipta & Masuk") : t("Enter", "Masuk")}
          </button>
          <Link href="/" className="small center">
            {t("Back", "Kembali")}
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
          {tr(toast)}
        </div>
      )}
      {room.unavailable ? (
        <ServerUnavailable onRetry={room.retry} />
      ) : (
        status !== "open" && (
          <div className="notice small" style={{ marginBottom: 12 }}>
            {t("Connection lost — reconnecting…", "Sambungan terputus — cuba menyambung semula…")}
          </div>
        )
      )}
      {state!.phase === "lobby" && <Lobby state={state!} me={me} send={room.send} onLeave={leave} />}
      {showRollResults && <RollPhase state={state!} me={me} send={room.send} lastRoll={lastRoll} />}
      {state!.phase === "picking" && !holdResults && <PickPhase state={state!} me={me} send={room.send} />}
      {state!.phase === "playing" && state!.game && (
        <GameView
          state={state!}
          me={me}
          send={room.send}
          serverNow={room.serverNow}
          move={move}
          roll={boardRoll}
          notice={drumText}
        />
      )}
      {state!.phase === "ended" && state!.game && <GameOver state={state!} me={me} send={room.send} onLeave={leave} />}
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
  const { t, tr } = useLang();
  return (
    <main className="page">
      <header className="room-header">
        <Link href="/" aria-label={t("Home", "Laman utama")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="room-logo" src="/img/logo.jpg" alt="ChemVenture" />
        </Link>
        <div>
          <div className="muted small">{t("Room", "Bilik")}</div>
          <div className="room-code">{code}</div>
        </div>
        <span className="spacer" />
        {phase && <span className="phase-tag">{tr(PHASE_LABEL[phase])}</span>}
        <div className="top-controls">
          <LangToggle />
          <SoundControls />
        </div>
        {connected !== undefined && (
          <span className={`conn-dot ${connected ? "" : "off"}`} title={connected ? t("Connected", "Bersambung") : t("Disconnected", "Terputus")} />
        )}
      </header>
      {children}
    </main>
  );
}

/** Local time of the daily free-plan reset (midnight UTC = 8:00 am in Malaysia). */
function resetTimeLocal(): string {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return reset.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Shown when the game server hasn't been reachable for a while. Keeps retrying in the background. */
function ServerUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useLang();
  // Malaysia is UTC+8: players there just see "8:00 am"; others also get the Malaysian time for reference.
  const inMalaysiaTime = new Date().getTimezoneOffset() === -480;
  const at = inMalaysiaTime ? resetTimeLocal() : `${resetTimeLocal()} (8:00 am Malaysia time)`;
  const atMs = inMalaysiaTime ? resetTimeLocal() : `${resetTimeLocal()} (8:00 pagi waktu Malaysia)`;
  return (
    <div className="panel server-down" role="alert">
      <div className="server-down-icon" aria-hidden>
        📡
      </div>
      <div className="stack" style={{ gap: 6, flex: 1 }}>
        <strong>{t("The game server can't be reached right now.", "Pelayan permainan tidak dapat dihubungi sekarang.")}</strong>
        <span className="small">
          {t("Check your internet connection. We'll keep trying to reconnect.", "Semak sambungan internet anda. Kami akan terus cuba menyambung semula.")}
        </span>
        <span className="small muted">
          {t(
            `If lots of games were played today, the free daily limit may be used up — it resets at ${at}.`,
            `Jika banyak permainan dimainkan hari ini, had harian percuma mungkin sudah habis — ia ditetapkan semula pada ${atMs}.`,
          )}
        </span>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary btn-small" onClick={onRetry}>
            {t("Try again", "Cuba lagi")}
          </button>
          <Link className="btn btn-ghost btn-small" href="/">
            {t("Back to home", "Kembali ke laman utama")}
          </Link>
        </div>
      </div>
    </div>
  );
}
