import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actFor,
  canStart,
  createInitialState,
  createRoom,
  joinRoom,
  kick,
  leaveRoom,
  markDisconnected,
  pickCharacter,
  roll,
  setReady,
  startGame,
  tick,
  type Result,
} from "./rules.ts";
import { DISCONNECT_GRACE_MS, type RoomState } from "./types.ts";

function must(r: Result): RoomState {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${r.message}`);
  return r.state;
}
function code(r: Result) {
  assert.equal(r.ok, false);
  return (r as Extract<Result, { ok: false }>).code;
}

function lobby(n: number): RoomState {
  let s = must(createRoom(createInitialState("ABCDE"), "p1", "Ali"));
  for (let i = 2; i <= n; i++) s = must(joinRoom(s, `p${i}`, `Player ${i}`));
  return s;
}
function readyAll(s: RoomState) {
  for (const p of s.players) s = must(setReady(s, p.id, true));
  return s;
}

test("create + join, host is creator", () => {
  const s = lobby(3);
  assert.equal(s.hostId, "p1");
  assert.equal(s.players.length, 3);
});

test("join a room that was never created fails", () => {
  assert.equal(code(joinRoom(createInitialState("ZZZZZ"), "x", "Abu")), "ROOM_NOT_FOUND");
});

test("create an existing room fails for strangers, rejoins for members", () => {
  const s = lobby(1);
  assert.equal(code(createRoom(s, "other", "Abu")), "ROOM_EXISTS");
  assert.ok(createRoom(s, "p1", "Ali").ok);
});

test("max 5 players, names unique and required", () => {
  const s = lobby(5);
  assert.equal(code(joinRoom(s, "p6", "Six")), "ROOM_FULL");
  const t = lobby(2);
  assert.equal(code(joinRoom(t, "p3", "  ali ")), "NAME_TAKEN");
  assert.equal(code(joinRoom(t, "p3", "   ")), "NAME_INVALID");
});

test("only host can start, and only when everyone is ready", () => {
  let s = lobby(3);
  assert.equal(canStart(s), false);
  assert.equal(code(startGame(s, "p1")), "NOT_ALLOWED");
  s = readyAll(s);
  assert.equal(code(startGame(s, "p2")), "NOT_HOST");
  s = must(startGame(s, "p1"));
  assert.equal(s.phase, "rolling");
  assert.ok(s.players.every((p) => p.mustRoll));
});

test("a single player cannot start", () => {
  const s = readyAll(lobby(1));
  assert.equal(code(startGame(s, "p1")), "NOT_ALLOWED");
});

test("cannot join after the game started, but members can reconnect", () => {
  let s = must(startGame(readyAll(lobby(2)), "p1"));
  assert.equal(code(joinRoom(s, "new", "New")), "GAME_STARTED");
  s = markDisconnected(s, "p2", 0);
  s = must(joinRoom(s, "p2", "whatever"));
  assert.equal(s.players[1].connected, true);
  assert.equal(s.players[1].name, "Player 2"); // name locked once game started
});

test("rolling with no ties decides turn order and moves to picking", () => {
  let s = must(startGame(readyAll(lobby(3)), "p1"));
  s = must(roll(s, "p1", 2));
  assert.equal(code(roll(s, "p1", 3)), "NOT_YOUR_TURN"); // can't roll twice
  s = must(roll(s, "p2", 6));
  const r = roll(s, "p3", 4);
  s = must(r);
  assert.equal(s.phase, "picking");
  assert.deepEqual(s.turnOrder, ["p2", "p3", "p1"]);
  assert.ok(r.ok && r.events.some((e) => e.type === "turnOrderDecided"));
});

test("ties re-roll and ADD to the existing score (manual rule 1)", () => {
  let s = must(startGame(readyAll(lobby(3)), "p1"));
  s = must(roll(s, "p1", 5));
  s = must(roll(s, "p2", 5));
  const r = roll(s, "p3", 2);
  s = must(r);
  assert.equal(s.phase, "rolling");
  assert.equal(s.rollRound, 2);
  assert.deepEqual(s.players.filter((p) => p.mustRoll).map((p) => p.id), ["p1", "p2"]);
  assert.equal(code(roll(s, "p3", 1)), "NOT_YOUR_TURN");

  s = must(roll(s, "p1", 1)); // 6
  s = must(roll(s, "p2", 3)); // 8
  assert.equal(s.phase, "picking");
  assert.deepEqual(s.turnOrder, ["p2", "p1", "p3"]);
  assert.deepEqual(s.players[0].rolls, [5, 1]);
});

test("a re-roll that creates a new tie pulls that player in too", () => {
  let s = must(startGame(readyAll(lobby(3)), "p1"));
  s = must(roll(s, "p1", 3));
  s = must(roll(s, "p2", 3));
  s = must(roll(s, "p3", 5));
  s = must(roll(s, "p1", 2)); // 5 -> ties with p3
  s = must(roll(s, "p2", 6)); // 9
  assert.equal(s.phase, "rolling");
  assert.deepEqual(s.players.filter((p) => p.mustRoll).map((p) => p.id), ["p1", "p3"]);
});

test("characters are picked in turn order and cannot be taken twice", () => {
  let s = must(startGame(readyAll(lobby(2)), "p1"));
  s = must(roll(s, "p1", 1));
  s = must(roll(s, "p2", 6));
  assert.equal(code(pickCharacter(s, "p1", "quark")), "NOT_YOUR_TURN");
  s = must(pickCharacter(s, "p2", "quark"));
  assert.equal(code(pickCharacter(s, "p1", "quark")), "CHARACTER_TAKEN");
  assert.equal(code(pickCharacter(s, "p1", "pikachu")), "BAD_MESSAGE");
  s = must(pickCharacter(s, "p1", "calco"));
  assert.equal(s.phase, "playing");
});

test("host can roll / pick for a disconnected player", () => {
  let s = must(startGame(readyAll(lobby(2)), "p1"));
  s = must(roll(s, "p1", 2));
  assert.equal(code(actFor(s, "p1", "p2", 4)), "NOT_ALLOWED"); // still connected
  s = markDisconnected(s, "p2", 0);
  assert.equal(code(actFor(s, "p2", "p2", 4)), "NOT_HOST");
  s = must(actFor(s, "p1", "p2", 4));
  assert.equal(s.phase, "picking");
  assert.deepEqual(s.turnOrder, ["p2", "p1"]);
  s = must(actFor(s, "p1", "p2", 0));
  assert.equal(s.players[1].character, "oxyra");
});

test("lobby: disconnected players are removed after the grace period, host passes on", () => {
  let s = lobby(3);
  s = markDisconnected(s, "p1", 1000);
  assert.equal(tick(s, 1000 + DISCONNECT_GRACE_MS - 1).players.length, 3);
  s = tick(s, 1000 + DISCONNECT_GRACE_MS);
  assert.equal(s.players.length, 2);
  assert.equal(s.hostId, "p2");
});

test("in game: disconnected players keep their seat, host passes on", () => {
  let s = must(startGame(readyAll(lobby(2)), "p1"));
  s = markDisconnected(s, "p1", 0);
  s = tick(s, DISCONNECT_GRACE_MS);
  assert.equal(s.players.length, 2);
  assert.equal(s.hostId, "p2");
});

test("leaving and kicking", () => {
  let s = lobby(3);
  assert.equal(code(kick(s, "p2", "p3")), "NOT_HOST");
  s = must(kick(s, "p1", "p3"));
  assert.equal(s.players.length, 2);
  s = must(leaveRoom(s, "p1", 0));
  assert.equal(s.hostId, "p2");
  s = must(leaveRoom(s, "p2", 0));
  assert.equal(s.created, false); // empty room frees the code
});
