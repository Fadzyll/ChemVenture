/**
 * Pure room/lobby rules. No network, no randomness, no clocks:
 * the server passes dice values and timestamps in, so everything here is unit-testable.
 */
import { CHARACTER_IDS, isCharacterId, type CharacterId } from "./characters.ts";
import {
  DISCONNECT_GRACE_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_MAX_LENGTH,
  type ErrorCode,
  type GameEvent,
  type Player,
  type RoomState,
} from "./types.ts";

export type Result =
  | { ok: true; state: RoomState; events: GameEvent[] }
  | { ok: false; code: ErrorCode; message: string };

const fail = (code: ErrorCode, message: string): Result => ({ ok: false, code, message });
const ok = (state: RoomState, events: GameEvent[] = []): Result => ({ ok: true, state, events });

export function createInitialState(code: string): RoomState {
  return {
    code,
    created: false,
    phase: "lobby",
    hostId: null,
    players: [],
    rollRound: 0,
    turnOrder: [],
    pickIndex: 0,
  };
}

export function cleanName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const cleaned = name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

function newPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    ready: false,
    connected: true,
    disconnectedAt: null,
    character: null,
    rollTotal: 0,
    rolls: [],
    mustRoll: false,
  };
}

const clone = (s: RoomState): RoomState => structuredClone(s);
const findPlayer = (s: RoomState, id: string) => s.players.find((p) => p.id === id);

/** Create a room (or treat it as a re-join if this player is already inside). */
export function createRoom(state: RoomState, playerId: string, rawName: unknown): Result {
  if (state.created) {
    if (findPlayer(state, playerId)) return joinRoom(state, playerId, rawName);
    return fail("ROOM_EXISTS", "Kod bilik ini sudah digunakan.");
  }
  const name = cleanName(rawName);
  if (!name) return fail("NAME_INVALID", "Sila masukkan nama.");
  const s = createInitialState(state.code);
  s.created = true;
  s.hostId = playerId;
  s.players.push(newPlayer(playerId, name));
  return ok(s);
}

export function joinRoom(state: RoomState, playerId: string, rawName: unknown): Result {
  if (!state.created) return fail("ROOM_NOT_FOUND", "Bilik tidak dijumpai.");
  const name = cleanName(rawName);
  const existing = findPlayer(state, playerId);

  // Reconnect: keep the seat. Name can only change in the lobby.
  if (existing) {
    const s = clone(state);
    const p = findPlayer(s, playerId)!;
    p.connected = true;
    p.disconnectedAt = null;
    if (s.phase === "lobby" && name && !nameTaken(s, name, playerId)) p.name = name;
    return ok(s);
  }

  if (state.phase !== "lobby") return fail("GAME_STARTED", "Permainan sudah bermula.");
  if (state.players.length >= MAX_PLAYERS) return fail("ROOM_FULL", "Bilik sudah penuh (5 pemain).");
  if (!name) return fail("NAME_INVALID", "Sila masukkan nama.");
  if (nameTaken(state, name, playerId)) return fail("NAME_TAKEN", "Nama ini sudah digunakan.");

  const s = clone(state);
  s.players.push(newPlayer(playerId, name));
  if (!s.hostId) s.hostId = playerId;
  return ok(s);
}

function nameTaken(s: RoomState, name: string, exceptId: string) {
  const n = name.toLowerCase();
  return s.players.some((p) => p.id !== exceptId && p.name.toLowerCase() === n);
}

export function setReady(state: RoomState, playerId: string, ready: boolean): Result {
  if (state.phase !== "lobby") return fail("NOT_ALLOWED", "Permainan sudah bermula.");
  const s = clone(state);
  const p = findPlayer(s, playerId);
  if (!p) return fail("NOT_JOINED", "Anda belum menyertai bilik.");
  p.ready = ready;
  return ok(s);
}

export function canStart(state: RoomState): boolean {
  return (
    state.phase === "lobby" &&
    state.players.length >= MIN_PLAYERS &&
    state.players.every((p) => p.ready && p.connected)
  );
}

export function startGame(state: RoomState, playerId: string): Result {
  if (state.hostId !== playerId) return fail("NOT_HOST", "Hanya hos boleh memulakan permainan.");
  if (!canStart(state)) {
    return fail("NOT_ALLOWED", `Perlukan ${MIN_PLAYERS}–${MAX_PLAYERS} pemain dan semua mesti sedia.`);
  }
  const s = clone(state);
  s.phase = "rolling";
  s.rollRound = 1;
  s.turnOrder = [];
  s.pickIndex = 0;
  for (const p of s.players) {
    p.rollTotal = 0;
    p.rolls = [];
    p.mustRoll = true;
    p.character = null;
  }
  return ok(s);
}

/**
 * Manual rule 1: everyone rolls; highest goes first and picks a character first.
 * If scores tie, the tied players roll again and ADD to their existing score.
 * We repeat until every total is unique, which gives a full turn order.
 */
export function roll(state: RoomState, playerId: string, value: number): Result {
  if (state.phase !== "rolling") return fail("NOT_ALLOWED", "Bukan masa membaling dadu.");
  if (!Number.isInteger(value) || value < 1 || value > 6) return fail("BAD_MESSAGE", "Nilai dadu tidak sah.");
  const s = clone(state);
  const p = findPlayer(s, playerId);
  if (!p) return fail("NOT_JOINED", "Anda belum menyertai bilik.");
  if (!p.mustRoll) return fail("NOT_YOUR_TURN", "Tunggu pemain lain membaling dadu.");

  p.rollTotal += value;
  p.rolls.push(value);
  p.mustRoll = false;
  const events: GameEvent[] = [{ type: "rolled", playerId, value, round: s.rollRound }];

  if (s.players.some((x) => x.mustRoll)) return ok(s, events);

  // Everyone in this round has rolled: find ties across ALL totals.
  const byTotal = new Map<number, Player[]>();
  for (const x of s.players) byTotal.set(x.rollTotal, [...(byTotal.get(x.rollTotal) ?? []), x]);
  const tied = [...byTotal.values()].filter((g) => g.length > 1).flat();

  if (tied.length > 0) {
    s.rollRound += 1;
    for (const x of tied) x.mustRoll = true;
    events.push({ type: "tie", playerIds: tied.map((x) => x.id), round: s.rollRound });
    return ok(s, events);
  }

  s.turnOrder = [...s.players].sort((a, b) => b.rollTotal - a.rollTotal).map((x) => x.id);
  s.phase = "picking";
  s.pickIndex = 0;
  events.push({ type: "turnOrderDecided", turnOrder: s.turnOrder });
  return ok(s, events);
}

export function takenCharacters(state: RoomState): CharacterId[] {
  return state.players.flatMap((p) => (p.character ? [p.character] : []));
}

export function currentPicker(state: RoomState): string | null {
  return state.phase === "picking" ? (state.turnOrder[state.pickIndex] ?? null) : null;
}

export function pickCharacter(state: RoomState, playerId: string, character: unknown): Result {
  if (state.phase !== "picking") return fail("NOT_ALLOWED", "Bukan masa memilih karakter.");
  if (!isCharacterId(character)) return fail("BAD_MESSAGE", "Karakter tidak sah.");
  if (currentPicker(state) !== playerId) return fail("NOT_YOUR_TURN", "Belum giliran anda memilih.");
  if (takenCharacters(state).includes(character)) return fail("CHARACTER_TAKEN", "Karakter sudah dipilih.");

  const s = clone(state);
  findPlayer(s, playerId)!.character = character;
  s.pickIndex += 1;
  if (s.pickIndex >= s.turnOrder.length) s.phase = "playing";
  return ok(s, [{ type: "picked", playerId, character }]);
}

/** Host moves the game along for a player who has dropped out. */
export function actFor(
  state: RoomState,
  hostId: string,
  targetId: string,
  diceValue: number,
): Result {
  if (state.hostId !== hostId) return fail("NOT_HOST", "Hanya hos boleh berbuat demikian.");
  const target = findPlayer(state, targetId);
  if (!target) return fail("NOT_JOINED", "Pemain tidak dijumpai.");
  if (target.connected) return fail("NOT_ALLOWED", "Pemain ini masih bersambung.");
  if (state.phase === "rolling") return roll(state, targetId, diceValue);
  if (state.phase === "picking") {
    const free = CHARACTER_IDS.find((c) => !takenCharacters(state).includes(c));
    return pickCharacter(state, targetId, free);
  }
  return fail("NOT_ALLOWED", "Tiada tindakan diperlukan.");
}

/** Leaving is only a real "leave" in the lobby; in-game it just marks the player disconnected. */
export function leaveRoom(state: RoomState, playerId: string, now: number): Result {
  if (!findPlayer(state, playerId)) return fail("NOT_JOINED", "Anda belum menyertai bilik.");
  if (state.phase === "lobby") return ok(removePlayer(state, playerId));
  return ok(markDisconnected(state, playerId, now));
}

export function kick(state: RoomState, hostId: string, targetId: string): Result {
  if (state.hostId !== hostId) return fail("NOT_HOST", "Hanya hos boleh mengeluarkan pemain.");
  if (state.phase !== "lobby") return fail("NOT_ALLOWED", "Hanya boleh dalam lobi.");
  if (targetId === hostId || !findPlayer(state, targetId)) return fail("NOT_ALLOWED", "Tidak boleh.");
  return ok(removePlayer(state, targetId), [{ type: "kicked", playerId: targetId }]);
}

export function markDisconnected(state: RoomState, playerId: string, now: number): RoomState {
  const s = clone(state);
  const p = findPlayer(s, playerId);
  if (p && p.connected) {
    p.connected = false;
    p.disconnectedAt = now;
  }
  return s;
}

function removePlayer(state: RoomState, playerId: string): RoomState {
  const s = clone(state);
  s.players = s.players.filter((p) => p.id !== playerId);
  if (s.players.length === 0) return createInitialState(s.code); // free the code again
  if (s.hostId === playerId) s.hostId = s.players[0].id;
  return s;
}

/**
 * Housekeeping, run on a timer:
 *  - in the lobby, drop players that have been gone longer than the grace period
 *  - in any phase, hand the host role to the first connected player if the host is gone too long
 */
export function tick(state: RoomState, now: number): RoomState {
  let s = state;
  const expired = (p: Player) =>
    !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt >= DISCONNECT_GRACE_MS;

  if (s.phase === "lobby") {
    for (const p of s.players.filter(expired)) s = removePlayer(s, p.id);
  }
  const host = s.players.find((p) => p.id === s.hostId);
  if (host && expired(host)) {
    const next = s.players.find((p) => p.connected);
    if (next) s = { ...clone(s), hostId: next.id };
  }
  return s;
}
