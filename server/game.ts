/**
 * Board-game rules (Phase 3). Pure functions: randomness comes in through `Rng`
 * and time through `now`, so every rule can be unit-tested.
 * Server-only because it reads the answer key in ./cards.ts.
 */
import { BOARD, BOARD_SIZE, RADIKAL_INDEX, SQUARE_LABEL } from "../shared/board.ts";
import { CHARACTERS, POWER_USES } from "../shared/characters.ts";
import {
  CALCO_SECONDS,
  CHOICE_SECONDS,
  COIN_LABEL,
  COIN_VALUE,
  DRUM_QUESTION_SECONDS,
  ESCAPE_COST,
  GAME_MINUTES,
  PENALTY,
  QUARK_CHOICES,
  QUARK_SECONDS,
  QUESTION_SECONDS,
  REAKSI_BONUS,
  RESULT_SECONDS,
  REWARD,
  START_COINS,
  coinPoints,
  type CoinKind,
  type Coins,
} from "../shared/config.ts";
import * as rules from "../shared/rules.ts";
import {
  DISCONNECT_GRACE_MS,
  type DeckId,
  type GameEvent,
  type PublicQuestion,
  type RoomState,
  type Stage,
  type TurnResult,
} from "../shared/types.ts";
import { CARDS, DECK_CARD_IDS, toPublic, type DrumEffect, type EffectCard, type QuestionCard } from "./cards.ts";

export interface Rng {
  die(): number;
  shuffle<T>(items: T[]): T[];
}

type Result = rules.Result;
const fail = (code: Extract<Result, { ok: false }>["code"], message: string): Result => ({ ok: false, code, message });

const LOG_LIMIT = 40;
const sec = (n: number) => n * 1000;

// ---------------------------------------------------------------- coins

export const points = (c: Coins) => coinPoints(c);

function addCoins(c: Coins, gain: Partial<Coins>) {
  for (const k of Object.keys(gain) as CoinKind[]) c[k] += gain[k] ?? 0;
}

/**
 * Take `amount` points from a purse, using the biggest coin that fits first and
 * breaking a bigger coin (change in smaller coins) when needed.
 * Returns how many points were actually taken (less than asked if the purse runs out).
 */
export function takePoints(c: Coins, amount: number): number {
  let need = amount;
  while (need >= 2 && c.duplet > 0) {
    c.duplet--;
    need -= 2;
  }
  while (need >= 1 && c.singlet > 0) {
    c.singlet--;
    need -= 1;
  }
  while (need > 0 && (c.duplet > 0 || c.oktet > 0)) {
    if (c.duplet > 0) {
      c.duplet--;
      const change = COIN_VALUE.duplet - need;
      if (change > 0) c.singlet += change;
      need = Math.max(0, need - COIN_VALUE.duplet);
    } else {
      c.oktet--;
      const change = COIN_VALUE.oktet - need;
      if (change > 0) {
        c.duplet += Math.floor(change / 2);
        c.singlet += change % 2;
      }
      need = Math.max(0, need - COIN_VALUE.oktet);
    }
  }
  return amount - need;
}

function describe(coins: Partial<Coins>): string {
  return (Object.keys(coins) as CoinKind[])
    .filter((k) => (coins[k] ?? 0) > 0)
    .map((k) => `${coins[k]} koin ${COIN_LABEL[k].toLowerCase()}`)
    .join(" + ");
}

// ---------------------------------------------------------------- helpers

const clone = (s: RoomState): RoomState => structuredClone(s);
const player = (s: RoomState, id: string) => s.players.find((p) => p.id === id)!;
const active = (s: RoomState) => s.turnOrder.map((id) => player(s, id)).filter((p) => !p.eliminated);
export const currentPlayerId = (s: RoomState) => (s.game ? s.turnOrder[s.game.turnIndex] : null);

function log(s: RoomState, now: number, text: string) {
  s.game!.log.push({ at: now, text });
  if (s.game!.log.length > LOG_LIMIT) s.game!.log.splice(0, s.game!.log.length - LOG_LIMIT);
}

function draw(s: RoomState, deck: DeckId, rng: Rng): string {
  const decks = s.game!.decks!;
  if (decks[deck].length === 0) decks[deck] = rng.shuffle([...DECK_CARD_IDS[deck]]); // reshuffle
  return decks[deck].shift()!;
}

// ---------------------------------------------------------------- start

export function initGame(state: RoomState, now: number, rng: Rng): RoomState {
  const s = clone(state);
  for (const p of s.players) {
    p.position = 0;
    p.coins = { ...START_COINS };
    p.skipTurns = 0;
    p.eliminated = false;
    p.powersLeft = POWER_USES;
  }
  s.game = {
    startedAt: now,
    endsAt: now + GAME_MINUTES * 60_000,
    turnIndex: 0,
    turnNumber: 1,
    stage: { kind: "roll" },
    decks: {
      asas: rng.shuffle([...DECK_CARD_IDS.asas]),
      ion: rng.shuffle([...DECK_CARD_IDS.ion]),
      kovalen: rng.shuffle([...DECK_CARD_IDS.kovalen]),
      drum: rng.shuffle([...DECK_CARD_IDS.drum]),
    },
    log: [],
    lastMove: null,
    winnerIds: [],
    endReason: null,
  };
  log(s, now, `Permainan bermula! ${player(s, s.turnOrder[0]).name} mula dahulu.`);
  return s;
}

// ---------------------------------------------------------------- turn flow

export function roll(state: RoomState, playerId: string, now: number, rng: Rng): Result {
  if (state.phase !== "playing" || !state.game) return fail("NOT_ALLOWED", "Permainan belum bermula.");
  if (state.game.stage.kind !== "roll") return fail("NOT_ALLOWED", "Bukan masa membaling dadu.");
  if (currentPlayerId(state) !== playerId) return fail("NOT_YOUR_TURN", "Bukan giliran anda.");

  const s = clone(state);
  const value = rng.die();
  const events: GameEvent[] = [];
  const deltas: Record<string, number> = {};
  const lines: string[] = [];
  moveBy(s, playerId, value, now, events, deltas, lines, value);
  return resolveSquare(s, playerId, now, rng, events, deltas, lines);
}

function moveBy(
  s: RoomState,
  playerId: string,
  steps: number,
  now: number,
  events: GameEvent[],
  deltas: Record<string, number>,
  lines: string[],
  rollValue: number,
) {
  const p = player(s, playerId);
  const from = p.position;
  const to = (from + steps) % BOARD_SIZE;
  const passedReaksi = from + steps >= BOARD_SIZE; // passing or landing on REAKSI
  p.position = to;
  s.game!.lastMove = { playerId, from, to, roll: rollValue, at: now };
  events.push({ type: "moved", playerId, from, to, roll: rollValue, passedReaksi });
  log(s, now, `${p.name} membaling ${rollValue} → ${SQUARE_LABEL[BOARD[to].type]}.`);
  if (passedReaksi) {
    addCoins(p.coins, REAKSI_BONUS);
    deltas[playerId] = (deltas[playerId] ?? 0) + coinPoints(REAKSI_BONUS);
    lines.push(`Melepasi REAKSI: +${describe(REAKSI_BONUS)}.`);
    log(s, now, `${p.name} melepasi REAKSI (+${describe(REAKSI_BONUS)}).`);
  }
}

function resolveSquare(
  s: RoomState,
  playerId: string,
  now: number,
  rng: Rng,
  events: GameEvent[],
  deltas: Record<string, number>,
  lines: string[],
): Result {
  const p = player(s, playerId);
  const square = BOARD[p.position];
  const g = s.game!;

  switch (square.type) {
    case "reaksi":
    case "neutral":
      return finishTurn(s, now, events, {
        playerId,
        title: SQUARE_LABEL[square.type],
        lines: [...lines, square.type === "neutral" ? "Tiada soalan atau ganjaran. Singgah sahaja." : "Kembali ke petak permulaan."],
        deltas,
      });

    case "asas":
    case "ion":
    case "kovalen": {
      carry.set(s, { deltas, lines });
      // Quark's power: look at several cards and choose one (ION/KOVALEN only).
      const deck: DeckId = square.type;
      if (deck !== "asas" && p.character === "quark" && p.powersLeft > 0) {
        const ids = Array.from({ length: QUARK_CHOICES }, () => draw(s, deck, rng));
        carry.get(s).quark = [...new Set(ids)];
        g.stage = { kind: "quarkPick", deck, revealed: false, options: [], deadline: now + sec(QUARK_SECONDS) };
        return { ok: true, state: s, events };
      }
      askQuestion(s, playerId, CARDS[draw(s, square.type, rng)] as QuestionCard, now);
      return { ok: true, state: s, events };
    }

    case "drum": {
      const card = CARDS[draw(s, "drum", rng)];
      if (card.kind === "question") {
        g.stage = { kind: "drumQuestion", question: toPublic(card), answered: [], deadline: now + sec(DRUM_QUESTION_SECONDS) };
        drumAnswers.set(s, {});
        carry.set(s, { deltas, lines });
        log(s, now, "DRUM! Semua pemain menjawab soalan bersama.");
        return { ok: true, state: s, events };
      }
      return applyEffect(s, playerId, card, now, rng, events, deltas, lines);
    }

    case "radikal":
    case "gangguan":
      g.stage = {
        kind: "choice",
        square: square.type,
        canPay: points(p.coins) >= coinPoints(ESCAPE_COST),
        deadline: now + sec(CHOICE_SECONDS),
      };
      carry.set(s, { deltas, lines });
      return { ok: true, state: s, events };
  }
}

/**
 * Per-turn scratch data (points gained so far this turn, result lines, drum answers)
 * that must survive between messages but should not be sent to players.
 * It's kept on the game state under hidden keys and stripped by publicState().
 */
type Carry = {
  deltas: Record<string, number>;
  lines: string[];
  /** card ids Quark is choosing between */
  quark?: string[];
  /** a correct answer waiting for Calco's decision */
  pending?: { choice: number };
};
const carry = {
  get(s: RoomState): Carry {
    return ((s.game as unknown as { _carry?: Carry })._carry ??= { deltas: {}, lines: [] });
  },
  set(s: RoomState, c: Carry) {
    (s.game as unknown as { _carry?: Carry })._carry = c;
  },
};
const drumAnswers = {
  get(s: RoomState): Record<string, number | null> {
    return ((s.game as unknown as { _drum?: Record<string, number | null> })._drum ??= {});
  },
  set(s: RoomState, a: Record<string, number | null>) {
    (s.game as unknown as { _drum?: Record<string, number | null> })._drum = a;
  },
};

/** Strip server-only fields (draw piles, per-turn scratch, secret drum answers) before sending to players. */
export function publicState(s: RoomState): RoomState {
  if (!s.game) return s;
  const { decks: _d, _carry, _drum, ...game } = s.game as typeof s.game & { _carry?: unknown; _drum?: unknown };
  return { ...s, game };
}

// ---------------------------------------------------------------- answers

export function answer(state: RoomState, playerId: string, choice: number | null, now: number): Result {
  const g = state.game;
  if (state.phase !== "playing" || !g) return fail("NOT_ALLOWED", "Permainan belum bermula.");
  const stage = g.stage;

  if (stage.kind === "question") {
    if (stage.answererId !== playerId) return fail("NOT_YOUR_TURN", "Bukan giliran anda menjawab.");
    if (choice !== null && !validChoice(choice, stage.question.options.length)) return fail("BAD_MESSAGE", "Pilihan tidak sah.");
    const s = clone(state);
    const card = CARDS[stage.question.id] as QuestionCard;
    // Calco's power: a correct ION/KOVALEN answer by someone else can have its reward blocked.
    if (choice === card.answer && card.deck !== "asas") {
      const calco = active(s).find((p) => p.character === "calco" && p.id !== playerId && p.powersLeft > 0 && p.connected);
      if (calco) {
        carry.get(s).pending = { choice };
        s.game!.stage = {
          kind: "calcoWindow",
          answererId: playerId,
          calcoId: calco.id,
          question: stage.question,
          deadline: now + sec(CALCO_SECONDS),
        };
        log(s, now, `${player(s, playerId).name} menjawab betul. Adakah ${calco.name} (Calco) akan menghalang?`);
        return { ok: true, state: s, events: [] };
      }
    }
    return settleAnswer(s, playerId, card, stage.question, choice, false, now);
  }

  if (stage.kind === "drumQuestion") {
    const p = state.players.find((x) => x.id === playerId);
    if (!p || p.eliminated || !state.turnOrder.includes(playerId)) return fail("NOT_ALLOWED", "Anda tidak boleh menjawab.");
    if (stage.answered.includes(playerId)) return fail("NOT_ALLOWED", "Anda sudah menjawab.");
    if (choice !== null && !validChoice(choice, stage.question.options.length)) return fail("BAD_MESSAGE", "Pilihan tidak sah.");
    const s = clone(state);
    const st = s.game!.stage as Extract<typeof stage, { kind: "drumQuestion" }>;
    st.answered.push(playerId);
    drumAnswers.get(s)[playerId] = choice;
    if (active(s).every((x) => st.answered.includes(x.id))) return resolveDrumQuestion(s, now);
    return { ok: true, state: s, events: [] };
  }

  return fail("NOT_ALLOWED", "Tiada soalan untuk dijawab.");
}

const validChoice = (c: number, n: number) => Number.isInteger(c) && c >= 0 && c < n;

function askQuestion(s: RoomState, answererId: string, card: QuestionCard, now: number) {
  s.game!.stage = { kind: "question", question: toPublic(card), answererId, deadline: now + sec(QUESTION_SECONDS) };
}

/** Apply the reward / penalty for an answer and end the turn. `blocked` = Calco stopped the reward. */
function settleAnswer(
  s: RoomState,
  answererId: string,
  card: QuestionCard,
  question: PublicQuestion,
  choice: number | null,
  blocked: boolean,
  now: number,
): Result {
  const p = player(s, answererId);
  const { deltas, lines } = carry.get(s);
  const correct = choice === card.answer;
  let delta = 0;
  if (correct && blocked) {
    lines.push(`${p.name}: betul, tetapi ganjaran dihalang oleh Calco!`);
  } else if (correct) {
    const reward = card.deck === "asas" ? REWARD.asasCorrect : REWARD.ionKovalenCorrect;
    addCoins(p.coins, reward);
    delta = coinPoints(reward);
    lines.push(`${p.name}: betul! +${describe(reward)}.`);
  } else {
    delta = -takePoints(p.coins, coinPoints(PENALTY.wrongAnswer));
    lines.push(
      choice === null
        ? `${p.name}: masa tamat! −${describe(PENALTY.wrongAnswer)}.`
        : `${p.name}: salah. −${describe(PENALTY.wrongAnswer)}.`,
    );
  }
  deltas[answererId] = (deltas[answererId] ?? 0) + delta;
  carry.get(s).pending = undefined;
  log(s, now, `${p.name} ${correct ? "menjawab betul" : "menjawab salah"} soalan ${card.deck.toUpperCase()}.`);
  return finishTurn(s, now, [], {
    playerId: currentPlayerId(s)!,
    title: correct ? (blocked ? "Ganjaran dihalang!" : "Jawapan betul!") : "Jawapan salah",
    lines,
    question,
    correctIndex: card.answer,
    answers: { [answererId]: choice },
    deltas,
  });
}

// ---------------------------------------------------------------- character powers

/**
 * - Oxyra:   on your turn before rolling, take 1 duplet from the bank.
 * - Ghoston: on your turn before rolling, take 2 singlets from a chosen player.
 * - Mystra:  when you must answer an ION/KOVALEN card, make another player answer it instead.
 * - Quark:   when offered (landing on ION/KOVALEN), reveal the cards to choose from.
 * - Calco:   in the Calco window, block the reward.
 * Every power can be used POWER_USES (2) times per game.
 */
export function usePower(state: RoomState, playerId: string, targetId: string | undefined, now: number): Result {
  const g = state.game;
  if (state.phase !== "playing" || !g) return fail("NOT_ALLOWED", "Permainan belum bermula.");
  const me = state.players.find((p) => p.id === playerId);
  if (!me || me.eliminated || !me.character || !state.turnOrder.includes(playerId)) {
    return fail("NOT_ALLOWED", "Anda tidak boleh menggunakan kuasa.");
  }
  if (me.powersLeft <= 0) return fail("NOT_ALLOWED", "Kuasa anda sudah habis digunakan.");
  const stage = g.stage;
  const isCurrent = currentPlayerId(state) === playerId;
  const s = clone(state);
  const p = player(s, playerId);
  const name = CHARACTERS[me.character].name;
  const spend = (text: string): GameEvent[] => {
    p.powersLeft -= 1;
    log(s, now, `${p.name} (${name}) guna kuasa: ${text}`);
    return [{ type: "power", playerId, text: `${p.name} (${name}): ${text}` }];
  };
  const pickTarget = () => {
    const t = s.players.find((x) => x.id === targetId);
    return t && t.id !== playerId && !t.eliminated && s.turnOrder.includes(t.id) ? t : null;
  };

  switch (me.character) {
    case "oxyra": {
      if (!isCurrent || stage.kind !== "roll") return fail("NOT_ALLOWED", "Guna kuasa Oxyra pada giliran anda sebelum membaling dadu.");
      p.coins.duplet += 1;
      return { ok: true, state: s, events: spend("ambil 1 koin duplet daripada bank.") };
    }
    case "ghoston": {
      if (!isCurrent || stage.kind !== "roll") return fail("NOT_ALLOWED", "Guna kuasa Ghoston pada giliran anda sebelum membaling dadu.");
      const t = pickTarget();
      if (!t) return fail("BAD_MESSAGE", "Pilih pemain lain.");
      if (points(t.coins) <= 0) return fail("NOT_ALLOWED", "Pemain itu tiada koin.");
      const got = takePoints(t.coins, 2 * COIN_VALUE.singlet);
      p.coins.singlet += got;
      const events = spend(`ambil ${got} koin singlet daripada ${t.name}.`);
      eliminateBroke(s, now, events, []);
      if (active(s).length <= 1) return { ok: true, state: endGame(s, now, "lastPlayer"), events };
      return { ok: true, state: s, events };
    }
    case "mystra": {
      if (stage.kind !== "question" || stage.answererId !== playerId || stage.challengedBy || stage.question.deck === "asas") {
        return fail("NOT_ALLOWED", "Mystra hanya boleh mencabar semasa menjawab kad ION/KOVALEN.");
      }
      const t = pickTarget();
      if (!t) return fail("BAD_MESSAGE", "Pilih pemain lain.");
      const st = s.game!.stage as Extract<Stage, { kind: "question" }>;
      st.answererId = t.id;
      st.challengedBy = playerId;
      st.deadline = now + sec(QUESTION_SECONDS);
      return { ok: true, state: s, events: spend(`mencabar ${t.name} menjawab soalan ini!`) };
    }
    case "quark": {
      if (stage.kind !== "quarkPick" || !isCurrent || stage.revealed) {
        return fail("NOT_ALLOWED", "Kuasa Quark digunakan apabila menjejak petak ION/KOVALEN.");
      }
      const ids = carry.get(s).quark ?? [];
      const st = s.game!.stage as Extract<Stage, { kind: "quarkPick" }>;
      st.revealed = true;
      st.options = ids.map((id) => toPublic(CARDS[id] as QuestionCard));
      st.deadline = now + sec(QUARK_SECONDS);
      return { ok: true, state: s, events: spend(`melihat ${ids.length} kad dan memilih satu.`) };
    }
    case "calco": {
      if (stage.kind !== "calcoWindow" || stage.calcoId !== playerId) {
        return fail("NOT_ALLOWED", "Kuasa Calco digunakan selepas pemain lain menjawab betul.");
      }
      const events = spend(`menghalang ganjaran ${player(s, stage.answererId).name}!`);
      const choice = carry.get(s).pending?.choice ?? null;
      const r = settleAnswer(s, stage.answererId, CARDS[stage.question.id] as QuestionCard, stage.question, choice, true, now);
      return r.ok ? { ...r, events: [...events, ...r.events] } : r;
    }
  }
}

/** Quark draws normally / Calco lets the reward through. */
export function skipPower(state: RoomState, playerId: string, now: number): Result {
  const stage = state.game?.stage;
  if (state.phase !== "playing" || !stage) return fail("NOT_ALLOWED", "Permainan belum bermula.");
  if (stage.kind === "quarkPick" && !stage.revealed && currentPlayerId(state) === playerId) {
    const s = clone(state);
    const [first, ...rest] = carry.get(s).quark ?? [];
    s.game!.decks![stage.deck].unshift(...rest); // put the unseen cards back on top
    carry.get(s).quark = undefined;
    askQuestion(s, playerId, CARDS[first] as QuestionCard, now);
    return { ok: true, state: s, events: [] };
  }
  if (stage.kind === "calcoWindow" && stage.calcoId === playerId) {
    const s = clone(state);
    const choice = carry.get(s).pending?.choice ?? null;
    return settleAnswer(s, stage.answererId, CARDS[stage.question.id] as QuestionCard, stage.question, choice, false, now);
  }
  return fail("NOT_ALLOWED", "Tiada kuasa untuk dilangkau.");
}

/** Quark picks one of the revealed cards. */
export function pickQuestion(state: RoomState, playerId: string, index: number, now: number): Result {
  const stage = state.game?.stage;
  if (state.phase !== "playing" || stage?.kind !== "quarkPick" || !stage.revealed) return fail("NOT_ALLOWED", "Tiada kad untuk dipilih.");
  if (currentPlayerId(state) !== playerId) return fail("NOT_YOUR_TURN", "Bukan giliran anda.");
  if (!validChoice(index, stage.options.length)) return fail("BAD_MESSAGE", "Pilihan tidak sah.");
  const s = clone(state);
  const ids = carry.get(s).quark ?? stage.options.map((o) => o.id);
  const chosen = ids[index];
  s.game!.decks![stage.deck].push(...ids.filter((id) => id !== chosen)); // the others go to the bottom
  carry.get(s).quark = undefined;
  askQuestion(s, playerId, CARDS[chosen] as QuestionCard, now);
  return { ok: true, state: s, events: [] };
}


function resolveDrumQuestion(s: RoomState, now: number): Result {
  const stage = s.game!.stage;
  if (stage.kind !== "drumQuestion") throw new Error("not a drum question");
  const card = CARDS[stage.question.id] as QuestionCard;
  const answers = { ...drumAnswers.get(s) };
  const { deltas, lines } = carry.get(s);
  const winners: string[] = [];
  for (const p of active(s)) {
    if (!(p.id in answers)) answers[p.id] = null;
    if (answers[p.id] === card.answer) {
      addCoins(p.coins, REWARD.drumQuestionCorrect);
      deltas[p.id] = (deltas[p.id] ?? 0) + coinPoints(REWARD.drumQuestionCorrect);
      winners.push(p.name);
    }
  }
  lines.push(
    winners.length
      ? `${winners.join(", ")} menjawab betul: +${describe(REWARD.drumQuestionCorrect)} setiap seorang.`
      : "Tiada siapa menjawab betul.",
  );
  log(s, now, `DRUM: ${winners.length ? winners.join(", ") + " betul" : "tiada jawapan betul"}.`);
  drumAnswers.set(s, {});
  return finishTurn(
    s,
    now,
    [],
    {
      playerId: currentPlayerId(s)!,
      title: "DRUM — Soalan bersama",
      lines,
      question: stage.question,
      correctIndex: card.answer,
      answers,
      deltas,
    },
    RESULT_SECONDS + 2,
  );
}

// ---------------------------------------------------------------- RADIKAL / GANGGUAN

/** "pay" = pay the escape cost. "decline" = rest a turn (RADIKAL) or go to RADIKAL (GANGGUAN). */
export function choose(state: RoomState, playerId: string, option: "pay" | "decline", now: number, rng: Rng): Result {
  const g = state.game;
  if (state.phase !== "playing" || !g || g.stage.kind !== "choice") return fail("NOT_ALLOWED", "Tiada pilihan untuk dibuat.");
  if (currentPlayerId(state) !== playerId) return fail("NOT_YOUR_TURN", "Bukan giliran anda.");
  if (option !== "pay" && option !== "decline") return fail("BAD_MESSAGE", "Pilihan tidak sah.");
  const stage = g.stage;
  if (option === "pay" && !stage.canPay) return fail("NOT_ALLOWED", "Koin tidak mencukupi.");

  const s = clone(state);
  const p = player(s, playerId);
  const { deltas, lines } = carry.get(s);
  const cost = coinPoints(ESCAPE_COST);

  if (option === "pay") {
    takePoints(p.coins, cost);
    deltas[playerId] = (deltas[playerId] ?? 0) - cost;
    const text = stage.square === "radikal" ? "membayar untuk keluar dari RADIKAL" : "membayar untuk kekal di GANGGUAN";
    lines.push(`${p.name} ${text}: −${describe(ESCAPE_COST)}.`);
    log(s, now, `${p.name} ${text}.`);
    return finishTurn(s, now, [], { playerId, title: SQUARE_LABEL[stage.square], lines, deltas });
  }

  if (stage.square === "radikal") {
    p.skipTurns += 1;
    lines.push(`${p.name} direhatkan selama satu pusingan.`);
    log(s, now, `${p.name} direhatkan satu pusingan di RADIKAL.`);
    return finishTurn(s, now, [], { playerId, title: "RADIKAL", lines, deltas });
  }

  // GANGGUAN, declined to pay: go to RADIKAL (which then offers its own choice).
  p.position = RADIKAL_INDEX;
  s.game!.lastMove = { playerId, from: BOARD.findIndex((b) => b.type === "gangguan"), to: RADIKAL_INDEX, roll: 0, at: now };
  lines.push(`${p.name} dihantar ke petak RADIKAL.`);
  log(s, now, `${p.name} dihantar ke RADIKAL.`);
  return resolveSquare(s, playerId, now, rng, [], deltas, lines);
}

// ---------------------------------------------------------------- DRUM effects

function applyEffect(
  s: RoomState,
  playerId: string,
  card: EffectCard,
  now: number,
  rng: Rng,
  events: GameEvent[],
  deltas: Record<string, number>,
  lines: string[],
): Result {
  const p = player(s, playerId);
  const e: DrumEffect = card.effect;
  events.push({ type: "drumCard", playerId, text: card.text });
  lines.push(card.text);
  log(s, now, `DRUM (${p.name}): ${card.text}`);
  const bump = (id: string, d: number) => (deltas[id] = (deltas[id] ?? 0) + d);

  switch (e.kind) {
    case "gain":
      p.coins[e.coin] += e.count;
      bump(playerId, e.count * COIN_VALUE[e.coin]);
      break;
    case "lose":
      bump(playerId, -takePoints(p.coins, e.count * COIN_VALUE[e.coin]));
      break;
    case "collectFromEach":
      for (const o of active(s)) {
        if (o.id === playerId) continue;
        const got = takePoints(o.coins, e.points);
        p.coins.singlet += got;
        bump(o.id, -got);
        bump(playerId, got);
      }
      break;
    case "payEach":
      for (const o of active(s)) {
        if (o.id === playerId) continue;
        const paid = takePoints(p.coins, e.points);
        o.coins.singlet += paid;
        bump(o.id, paid);
        bump(playerId, -paid);
      }
      break;
    case "goRadikal":
      p.position = RADIKAL_INDEX;
      p.skipTurns += 1;
      s.game!.lastMove = { playerId, from: s.game!.lastMove?.to ?? p.position, to: RADIKAL_INDEX, roll: 0, at: now };
      break;
    case "move":
      moveBy(s, playerId, e.steps, now, events, deltas, lines, 0);
      return resolveSquare(s, playerId, now, rng, events, deltas, lines);
  }
  return finishTurn(s, now, events, { playerId, title: "DRUM", lines, deltas });
}

// ---------------------------------------------------------------- end of turn

/** Manual rule 4: a player with no coins is out. */
function eliminateBroke(s: RoomState, now: number, events: GameEvent[], lines: string[]): RoomState {
  for (const p of active(s)) {
    if (points(p.coins) <= 0) {
      p.eliminated = true;
      events.push({ type: "eliminated", playerId: p.id });
      lines.push(`${p.name} kehabisan koin dan tersingkir!`);
      log(s, now, `${p.name} tersingkir.`);
    }
  }
  return s;
}

function finishTurn(s: RoomState, now: number, events: GameEvent[], result: TurnResult, seconds = RESULT_SECONDS): Result {
  carry.set(s, { deltas: {}, lines: [] });
  eliminateBroke(s, now, events, result.lines);
  if (active(s).length <= 1) return { ok: true, state: endGame(s, now, "lastPlayer"), events };
  s.game!.stage = { kind: "result", result, deadline: now + sec(seconds) };
  return { ok: true, state: s, events };
}

function nextTurn(s: RoomState, now: number): RoomState {
  const g = s.game!;
  const n = s.turnOrder.length;
  for (let step = 1; step <= n * 3; step++) {
    const idx = (g.turnIndex + step) % n;
    const p = player(s, s.turnOrder[idx]);
    if (p.eliminated) continue;
    if (p.skipTurns > 0) {
      p.skipTurns -= 1;
      log(s, now, `${p.name} direhatkan pusingan ini.`);
      continue;
    }
    g.turnIndex = idx;
    g.turnNumber += 1;
    g.stage = { kind: "roll" };
    return s;
  }
  return s;
}

export function endGame(state: RoomState, now: number, reason: "time" | "lastPlayer"): RoomState {
  const s = clone(state);
  const g = s.game!;
  const contenders = s.players.filter((p) => s.turnOrder.includes(p.id));
  const best = Math.max(...contenders.map((p) => points(p.coins)));
  g.winnerIds = contenders.filter((p) => points(p.coins) === best && !p.eliminated).map((p) => p.id);
  if (g.winnerIds.length === 0) g.winnerIds = contenders.filter((p) => points(p.coins) === best).map((p) => p.id);
  g.endReason = reason;
  g.stage = { kind: "roll" };
  s.phase = "ended";
  const names = g.winnerIds.map((id) => player(s, id).name).join(" & ");
  log(s, now, reason === "time" ? `Masa tamat! Pemenang: ${names}.` : `Hanya seorang pemain tinggal. Pemenang: ${names}.`);
  return s;
}

// ---------------------------------------------------------------- clock

/** Everything that happens because time passed: deadlines, the 20-minute timer, lobby housekeeping. */
export function advanceTime(state: RoomState, now: number, rng: Rng): { state: RoomState; events: GameEvent[] } {
  let s = rules.tick(state, now);
  const g = s.game;
  if (s.phase !== "playing" || !g) return { state: s, events: [] };

  if (now >= g.endsAt) return { state: endGame(s, now, "time"), events: [] };

  const stage = g.stage;
  const current = currentPlayerId(s)!;
  let r: Result | null = null;
  if (stage.kind === "question" && now >= stage.deadline) r = answer(s, stage.answererId, null, now);
  else if (stage.kind === "quarkPick" && now >= stage.deadline) {
    r = stage.revealed ? pickQuestion(s, current, 0, now) : skipPower(s, current, now);
  } else if (stage.kind === "calcoWindow" && now >= stage.deadline) r = skipPower(s, stage.calcoId, now);
  else if (stage.kind === "drumQuestion" && now >= stage.deadline) r = resolveDrumQuestion(clone(s), now);
  else if (stage.kind === "choice" && now >= stage.deadline) r = choose(s, current, "decline", now, rng);
  else if (stage.kind === "result" && now >= stage.deadline) return { state: nextTurn(clone(s), now), events: [] };
  else if (stage.kind === "roll") {
    // A disconnected player's turn is rolled automatically after the grace period.
    const p = player(s, current);
    if (!p.connected && p.disconnectedAt !== null && now - p.disconnectedAt >= DISCONNECT_GRACE_MS) r = roll(s, current, now, rng);
  }
  if (r && r.ok) return { state: r.state, events: r.events };
  return { state: s, events: [] };
}

/** When the server should wake up next to call advanceTime(). */
export function nextWakeAt(s: RoomState): number | null {
  const times: number[] = [];
  for (const p of s.players) {
    if (!p.connected && p.disconnectedAt !== null) times.push(p.disconnectedAt + DISCONNECT_GRACE_MS);
  }
  const g = s.game;
  if (s.phase === "playing" && g) {
    times.push(g.endsAt);
    if ("deadline" in g.stage) times.push(g.stage.deadline);
  }
  return times.length ? Math.min(...times) : null;
}

/** Host helps a disconnected player during the board game. */
export function actFor(state: RoomState, hostId: string, targetId: string, now: number, rng: Rng): Result {
  if (state.hostId !== hostId) return fail("NOT_HOST", "Hanya hos boleh berbuat demikian.");
  const target = state.players.find((p) => p.id === targetId);
  if (!target) return fail("NOT_JOINED", "Pemain tidak dijumpai.");
  if (target.connected) return fail("NOT_ALLOWED", "Pemain ini masih bersambung.");
  const stage = state.game?.stage;
  if (!stage) return fail("NOT_ALLOWED", "Tiada tindakan diperlukan.");
  if (stage.kind === "drumQuestion") return answer(state, targetId, null, now);
  if (stage.kind === "question" && stage.answererId === targetId) return answer(state, targetId, null, now);
  if (stage.kind === "calcoWindow" && stage.calcoId === targetId) return skipPower(state, targetId, now);
  if (currentPlayerId(state) !== targetId) return fail("NOT_ALLOWED", "Bukan giliran pemain ini.");
  if (stage.kind === "roll") return roll(state, targetId, now, rng);
  if (stage.kind === "quarkPick") return stage.revealed ? pickQuestion(state, targetId, 0, now) : skipPower(state, targetId, now);
  if (stage.kind === "choice") return choose(state, targetId, "decline", now, rng);
  return fail("NOT_ALLOWED", "Tiada tindakan diperlukan.");
}
