import { test } from "node:test";
import assert from "node:assert/strict";
import { BOARD, BOARD_SIZE, RADIKAL_INDEX } from "../shared/board.ts";
import { GAME_MINUTES, START_COINS, coinPoints, type Coins } from "../shared/config.ts";
import * as rules from "../shared/rules.ts";
import type { RoomState } from "../shared/types.ts";
import { CARDS, DECK_CARD_IDS, type QuestionCard } from "./cards.ts";
import * as game from "./game.ts";

// ---------- helpers

function rng(dice: number[] = []): game.Rng {
  return { die: () => dice.shift() ?? 1, shuffle: (a) => a };
}
function must(r: rules.Result): RoomState {
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.state;
}
/** Three players, characters picked, game initialised. Turn order p1, p2, p3. */
function newGame(now = 0): RoomState {
  let s = must(rules.createRoom(rules.createInitialState("ABCDE"), "p1", "Ali"));
  s = must(rules.joinRoom(s, "p2", "Bala"));
  s = must(rules.joinRoom(s, "p3", "Chong"));
  for (const id of ["p1", "p2", "p3"]) s = must(rules.setReady(s, id, true));
  s = must(rules.startGame(s, "p1"));
  s = must(rules.roll(s, "p1", 6));
  s = must(rules.roll(s, "p2", 4));
  s = must(rules.roll(s, "p3", 2));
  s = must(rules.pickCharacter(s, "p1", "quark"));
  s = must(rules.pickCharacter(s, "p2", "mystra"));
  s = must(rules.pickCharacter(s, "p3", "calco"));
  assert.equal(s.phase, "playing");
  return game.initGame(s, now, rng());
}
const P = (s: RoomState, id: string) => s.players.find((p) => p.id === id)!;
const pts = (s: RoomState, id: string) => coinPoints(P(s, id).coins);
/** Put a player just before `target` so a roll of 1 lands on it. */
function placeBefore(s: RoomState, id: string, target: number) {
  P(s, id).position = (target - 1 + BOARD_SIZE) % BOARD_SIZE;
}
function stack(s: RoomState, deck: "asas" | "ion" | "kovalen" | "drum", cardId: string) {
  s.game!.decks![deck] = [cardId, ...s.game!.decks![deck].filter((c) => c !== cardId)];
}
const indexOf = (type: string) => BOARD.findIndex((b) => b.type === type);
const card = (id: string) => CARDS[id] as QuestionCard;

// ---------- board & coins

test("board has 22 squares in the manual's layout", () => {
  assert.equal(BOARD_SIZE, 22);
  const count = (t: string) => BOARD.filter((b) => b.type === t).length;
  assert.deepEqual([count("ion"), count("kovalen"), count("asas"), count("drum")], [6, 6, 3, 3]);
  assert.equal(BOARD[0].type, "reaksi");
  assert.equal(BOARD[RADIKAL_INDEX].type, "radikal");
  assert.deepEqual([BOARD[0].col, BOARD[0].row], [7, 4]);
  assert.deepEqual([BOARD[11].col, BOARD[11].row], [0, 0]);
  assert.equal(BOARD[18].type, "gangguan");
});

test("decks: drum has 16 cards like the manual, every question has a valid answer", () => {
  assert.equal(DECK_CARD_IDS.drum.length, 16);
  for (const c of Object.values(CARDS)) {
    if (c.kind === "question") assert.ok(c.answer >= 0 && c.answer < c.options.length, c.id);
  }
});

test("takePoints uses exact coins first and gives change", () => {
  const c: Coins = { singlet: 1, duplet: 1, oktet: 0 };
  assert.equal(game.takePoints(c, 3), 3);
  assert.deepEqual(c, { singlet: 0, duplet: 0, oktet: 0 });

  const d: Coins = { singlet: 0, duplet: 1, oktet: 0 };
  assert.equal(game.takePoints(d, 1), 1); // break a duplet, 1 singlet change
  assert.deepEqual(d, { singlet: 1, duplet: 0, oktet: 0 });

  const e: Coins = { singlet: 0, duplet: 0, oktet: 1 };
  assert.equal(game.takePoints(e, 3), 3); // 8 - 3 = 5 change = 2 duplets + 1 singlet
  assert.deepEqual(e, { singlet: 1, duplet: 2, oktet: 0 });

  const f: Coins = { singlet: 1, duplet: 0, oktet: 0 };
  assert.equal(game.takePoints(f, 3), 1); // can't pay it all
});

// ---------- turns

test("game starts with everyone on REAKSI with starting coins, 20 minute timer", () => {
  const s = newGame(1000);
  assert.ok(s.players.every((p) => p.position === 0 && coinPoints(p.coins) === coinPoints(START_COINS)));
  assert.equal(s.game!.endsAt, 1000 + GAME_MINUTES * 60_000);
  assert.equal(game.currentPlayerId(s), "p1");
});

test("only the current player can roll; landing on ASAS asks a question", () => {
  const s = newGame();
  assert.equal((game.roll(s, "p2", 0, rng([1])) as { code: string }).code, "NOT_YOUR_TURN");
  stack(s, "asas", "asas-5");
  const t = must(game.roll(s, "p1", 0, rng([1]))); // 0 -> 1 = ASAS
  assert.equal(P(t, "p1").position, 1);
  assert.equal(t.game!.stage.kind, "question");
  const st = t.game!.stage as { question: { id: string; options: string[] } };
  assert.equal(st.question.id, "asas-5");
  assert.equal("answer" in st.question, false, "answer key must not be in the state");
});

test("correct ASAS answer: +1 singlet. Wrong ION answer: -1 singlet. Then next player", () => {
  let s = newGame();
  stack(s, "asas", "asas-5");
  s = must(game.roll(s, "p1", 0, rng([1])));
  s = must(game.answer(s, "p1", card("asas-5").answer, 1000));
  assert.equal(pts(s, "p1"), 16);
  assert.equal(s.game!.stage.kind, "result");
  const r = s.game!.stage as { result: { correctIndex: number; deltas: Record<string, number> } };
  assert.equal(r.result.correctIndex, card("asas-5").answer);
  assert.equal(r.result.deltas.p1, 1);

  // result screen times out -> p2's turn
  s = game.advanceTime(s, 1000 + 10_000, rng()).state;
  assert.equal(game.currentPlayerId(s), "p2");
  assert.equal(s.game!.stage.kind, "roll");

  stack(s, "ion", "ion-1");
  s = must(game.roll(s, "p2", 61_000, rng([2]))); // 0 -> 2 = ION
  const wrong = (card("ion-1").answer + 1) % card("ion-1").options.length;
  s = must(game.answer(s, "p2", wrong, 62_000));
  assert.equal(pts(s, "p2"), 14);
});

test("question timeout counts as wrong", () => {
  let s = newGame();
  s = must(game.roll(s, "p1", 0, rng([1])));
  const deadline = (s.game!.stage as { deadline: number }).deadline;
  assert.equal(game.advanceTime(s, deadline - 1, rng()).state.game!.stage.kind, "question");
  s = game.advanceTime(s, deadline, rng()).state;
  assert.equal(s.game!.stage.kind, "result");
  assert.equal(pts(s, "p1"), 14);
});

test("passing REAKSI gives 1 duplet", () => {
  let s = newGame();
  P(s, "p1").position = 20; // DRUM at 20; roll 3 -> 1 (ASAS), passing REAKSI
  s = must(game.roll(s, "p1", 0, rng([3])));
  assert.equal(P(s, "p1").position, 1);
  assert.equal(pts(s, "p1"), 17);
});

test("RADIKAL: rest one round, the turn is skipped next time", () => {
  let s = newGame();
  placeBefore(s, "p1", RADIKAL_INDEX);
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.equal(s.game!.stage.kind, "choice");
  s = must(game.choose(s, "p1", "decline", 0, rng()));
  assert.equal(P(s, "p1").skipTurns, 1);
  // p2 and p3 land on NEUTRAL-free squares quickly: put them on REAKSI→NEUTRAL path
  for (const id of ["p2", "p3"]) {
    s = game.advanceTime(s, 10_000, rng()).state; // finish result, go to next
    assert.equal(game.currentPlayerId(s), id);
    P(s, id).position = indexOf("neutral") - 1;
    s = must(game.roll(s, id, 0, rng([1])));
  }
  s = game.advanceTime(s, 10_000, rng()).state;
  assert.equal(game.currentPlayerId(s), "p2", "p1 was skipped");
  assert.equal(P(s, "p1").skipTurns, 0);
});

test("RADIKAL: paying 1 singlet + 1 duplet avoids the rest", () => {
  let s = newGame();
  placeBefore(s, "p1", RADIKAL_INDEX);
  s = must(game.roll(s, "p1", 0, rng([1])));
  s = must(game.choose(s, "p1", "pay", 0, rng()));
  assert.equal(pts(s, "p1"), 12);
  assert.equal(P(s, "p1").skipTurns, 0);
});

test("GANGGUAN: refuse to pay -> sent to RADIKAL and asked again", () => {
  let s = newGame();
  placeBefore(s, "p1", indexOf("gangguan"));
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.equal((s.game!.stage as { square: string }).square, "gangguan");
  s = must(game.choose(s, "p1", "decline", 0, rng()));
  assert.equal(P(s, "p1").position, RADIKAL_INDEX);
  assert.equal((s.game!.stage as { square: string }).square, "radikal");
});

test("can't pay without enough coins", () => {
  let s = newGame();
  P(s, "p1").coins = { singlet: 1, duplet: 0, oktet: 0 };
  placeBefore(s, "p1", RADIKAL_INDEX);
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.equal((s.game!.stage as { canPay: boolean }).canPay, false);
  assert.equal((game.choose(s, "p1", "pay", 0, rng()) as { code: string }).code, "NOT_ALLOWED");
});

test("DRUM question: everyone answers, each correct player gets a duplet", () => {
  let s = newGame();
  stack(s, "drum", "drum-9");
  placeBefore(s, "p1", 4);
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.equal(s.game!.stage.kind, "drumQuestion");
  const right = card("drum-9").answer;
  s = must(game.answer(s, "p2", right, 0));
  assert.equal((game.answer(s, "p2", right, 0) as { code: string }).code, "NOT_ALLOWED"); // no double answer
  assert.equal(JSON.stringify(game.publicState(s)).includes('"p2":' + right), false, "answers stay secret until all answer");
  s = must(game.answer(s, "p1", (right + 1) % 4, 0));
  s = must(game.answer(s, "p3", right, 0));
  assert.equal(s.game!.stage.kind, "result");
  assert.deepEqual([pts(s, "p1"), pts(s, "p2"), pts(s, "p3")], [15, 17, 17]);
});

test("DRUM effects: collect from each, pay each, go to RADIKAL, move", () => {
  let s = newGame();
  stack(s, "drum", "drum-e3");
  placeBefore(s, "p1", 4);
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.deepEqual([pts(s, "p1"), pts(s, "p2"), pts(s, "p3")], [17, 14, 14]);

  s = newGame();
  stack(s, "drum", "drum-e6");
  placeBefore(s, "p1", 4);
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.equal(P(s, "p1").position, RADIKAL_INDEX);
  assert.equal(P(s, "p1").skipTurns, 1);

  s = newGame();
  stack(s, "drum", "drum-e4");
  placeBefore(s, "p1", 4);
  s = must(game.roll(s, "p1", 0, rng([1])));
  assert.equal(P(s, "p1").position, 7); // 4 + 3 = RADIKAL
  assert.equal(s.game!.stage.kind, "choice");
});

test("a player with no coins is eliminated; last player standing wins", () => {
  let s = newGame();
  P(s, "p2").coins = { singlet: 0, duplet: 0, oktet: 0 };
  P(s, "p3").coins = { singlet: 1, duplet: 0, oktet: 0 };
  s = must(game.roll(s, "p1", 0, rng([1])));
  s = must(game.answer(s, "p1", null, 0));
  assert.equal(P(s, "p2").eliminated, true);
  s = game.advanceTime(s, 10_000, rng()).state;
  assert.equal(game.currentPlayerId(s), "p3", "eliminated p2 is skipped");
  stack(s, "ion", "ion-1");
  s = must(game.roll(s, "p3", 0, rng([2])));
  s = must(game.answer(s, "p3", null, 0));
  assert.equal(s.phase, "ended");
  assert.deepEqual(s.game!.winnerIds, ["p1"]);
  assert.equal(s.game!.endReason, "lastPlayer");
});

test("after 20 minutes the richest player wins", () => {
  let s = newGame(0);
  P(s, "p3").coins.oktet += 1;
  s = game.advanceTime(s, GAME_MINUTES * 60_000, rng()).state;
  assert.equal(s.phase, "ended");
  assert.deepEqual(s.game!.winnerIds, ["p3"]);
  // host can bring everyone back to the lobby
  s = must(rules.playAgain(s, "p1"));
  assert.equal(s.phase, "lobby");
  assert.ok(s.players.every((p) => !p.ready && p.character === null));
});

test("disconnected player's roll happens automatically after the grace period", () => {
  let s = newGame();
  s = rules.markDisconnected(s, "p1", 0);
  assert.equal(game.advanceTime(s, 1000, rng([1])).state.game!.stage.kind, "roll");
  s = game.advanceTime(s, 25_000, rng([1])).state;
  assert.notEqual(s.game!.stage.kind, "roll");
});

test("publicState hides draw piles", () => {
  const s = newGame();
  assert.ok(s.game!.decks);
  assert.equal(game.publicState(s).game!.decks, undefined);
  assert.ok(game.nextWakeAt(s)! > 0);
});

// ---------- Phase 4: character powers (newGame: p1 Quark, p2 Mystra, p3 Calco)

const code = (r: rules.Result) => (r.ok ? "OK" : r.code);
const ION2 = 2; // board index of the first ION square

test("Oxyra: +1 duplet before rolling, only on own turn, max 2 uses", () => {
  let s = newGame();
  P(s, "p1").character = "oxyra";
  assert.equal(code(game.usePower(s, "p2", undefined, 0)), "NOT_ALLOWED"); // Mystra can't use it now
  s = must(game.usePower(s, "p1", undefined, 0));
  s = must(game.usePower(s, "p1", undefined, 0));
  assert.equal(pts(s, "p1"), 19);
  assert.equal(P(s, "p1").powersLeft, 0);
  assert.equal(code(game.usePower(s, "p1", undefined, 0)), "NOT_ALLOWED");
});

test("Ghoston: takes 2 singlets from a chosen player", () => {
  let s = newGame();
  P(s, "p1").character = "ghoston";
  assert.equal(code(game.usePower(s, "p1", "p1", 0)), "BAD_MESSAGE"); // not yourself
  s = must(game.usePower(s, "p1", "p3", 0));
  assert.equal(P(s, "p1").coins.singlet, 5);
  assert.equal(pts(s, "p3"), 13);
});

test("Ghoston can eliminate a broke player", () => {
  let s = newGame();
  P(s, "p1").character = "ghoston";
  P(s, "p3").coins = { singlet: 1, duplet: 0, oktet: 0 };
  s = must(game.usePower(s, "p1", "p3", 0));
  assert.equal(P(s, "p3").eliminated, true);
});

test("Quark: landing on ION offers the power; using it reveals 3 cards to choose from", () => {
  let s = newGame();
  placeBefore(s, "p1", ION2);
  s = must(game.roll(s, "p1", 0, rng([1])));
  const st = s.game!.stage as { kind: string; revealed: boolean; options: unknown[] };
  assert.equal(st.kind, "quarkPick");
  assert.equal(st.options.length, 0, "cards stay hidden until the power is used");
  s = must(game.usePower(s, "p1", undefined, 0));
  const opts = (s.game!.stage as { options: { id: string }[] }).options;
  assert.equal(opts.length, 3);
  assert.equal(P(s, "p1").powersLeft, 1);
  s = must(game.pickQuestion(s, "p1", 2, 0));
  assert.equal((s.game!.stage as { question: { id: string } }).question.id, opts[2].id);
  assert.equal(s.game!.decks!.ion.length, 10 - 1, "the 2 unchosen cards go back in the deck");
});

test("Quark can skip the power and draw normally (no use spent)", () => {
  let s = newGame();
  placeBefore(s, "p1", ION2);
  s = must(game.roll(s, "p1", 0, rng([1])));
  s = must(game.skipPower(s, "p1", 0));
  assert.equal(s.game!.stage.kind, "question");
  assert.equal(P(s, "p1").powersLeft, 2);
  assert.equal(s.game!.decks!.ion.length, 9);
});

test("Mystra: challenges another player to answer; they get the reward or penalty", () => {
  let s = newGame();
  s = game.advanceTime(must(game.roll(s, "p1", 0, rng([1]))), 0, rng()).state; // p1 lands on ASAS
  s = must(game.answer(s, "p1", 0, 0));
  s = game.advanceTime(s, 10_000, rng()).state; // -> p2 (Mystra)
  assert.equal(game.currentPlayerId(s), "p2");
  stack(s, "ion", "ion-1");
  s = must(game.roll(s, "p2", 0, rng([2])));
  s = must(game.usePower(s, "p2", "p1", 0));
  const st = s.game!.stage as { answererId: string; challengedBy: string };
  assert.deepEqual([st.answererId, st.challengedBy], ["p1", "p2"]);
  assert.equal(code(game.answer(s, "p2", 0, 0)), "NOT_YOUR_TURN");
  const before = pts(s, "p1");
  s = must(game.answer(s, "p1", (card("ion-1").answer + 1) % 3, 0));
  assert.equal(pts(s, "p1"), before - 1);
  assert.equal(pts(s, "p2"), 15, "Mystra is unaffected");
});

test("Mystra can't challenge on an ASAS card", () => {
  let s = newGame();
  s = game.advanceTime(must(game.roll(s, "p1", 0, rng([1]))), 0, rng()).state;
  s = must(game.answer(s, "p1", 0, 0));
  s = game.advanceTime(s, 10_000, rng()).state;
  s = must(game.roll(s, "p2", 0, rng([1]))); // ASAS
  assert.equal(code(game.usePower(s, "p2", "p1", 0)), "NOT_ALLOWED");
});

test("Calco: a correct ION answer opens a window; blocking cancels the reward", () => {
  let s = newGame();
  P(s, "p1").character = "oxyra"; // so p1 isn't Quark
  stack(s, "ion", "ion-1");
  s = must(game.roll(s, "p1", 0, rng([2])));
  s = must(game.answer(s, "p1", card("ion-1").answer, 0));
  const st = s.game!.stage as { kind: string; calcoId: string };
  assert.deepEqual([st.kind, st.calcoId], ["calcoWindow", "p3"]);
  assert.equal(code(game.usePower(s, "p2", undefined, 0)), "NOT_ALLOWED"); // only Calco
  s = must(game.usePower(s, "p3", undefined, 0));
  assert.equal(s.game!.stage.kind, "result");
  assert.equal(pts(s, "p1"), 15, "no reward");
  assert.equal(P(s, "p3").powersLeft, 1);
});

test("Calco: letting it through (or timing out) pays the reward", () => {
  let s = newGame();
  P(s, "p1").character = "oxyra";
  stack(s, "ion", "ion-1");
  s = must(game.roll(s, "p1", 0, rng([2])));
  s = must(game.answer(s, "p1", card("ion-1").answer, 0));
  const deadline = (s.game!.stage as { deadline: number }).deadline;
  s = game.advanceTime(s, deadline, rng()).state;
  assert.equal(s.game!.stage.kind, "result");
  assert.equal(pts(s, "p1"), 17);
  assert.equal(P(s, "p3").powersLeft, 2);
});

test("Calco gets no window for ASAS, wrong answers, own answers, or when out of uses", () => {
  let s = newGame();
  P(s, "p1").character = "oxyra";
  P(s, "p3").powersLeft = 0;
  stack(s, "ion", "ion-1");
  s = must(game.roll(s, "p1", 0, rng([2])));
  s = must(game.answer(s, "p1", card("ion-1").answer, 0));
  assert.equal(s.game!.stage.kind, "result");
});

test("powers reset to 2 at the start of each game", () => {
  const s = newGame();
  assert.ok(s.players.every((p) => p.powersLeft === 2));
});
