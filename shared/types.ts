import type { CharacterId } from "./characters.ts";
import type { Coins } from "./config.ts";

export const MAX_PLAYERS = 5;
export const MIN_PLAYERS = 2;
export const NAME_MAX_LENGTH = 16;
/** How long a disconnected player keeps their seat in the lobby / host role. */
export const DISCONNECT_GRACE_MS = 20_000;

export type Phase =
  | "lobby" // players join, enter names, press ready
  | "rolling" // everyone rolls to decide turn order (ties re-roll and add)
  | "picking" // highest roller picks a character first, then the next...
  | "playing" // the board game
  | "ended"; // timer ran out or only one player left

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  /** epoch ms when the player dropped, null while connected */
  disconnectedAt: number | null;
  character: CharacterId | null;
  /** accumulated dice total used to decide turn order */
  rollTotal: number;
  /** every roll made during the turn-order phase */
  rolls: number[];
  /** true while this player still has to roll in the current round */
  mustRoll: boolean;
  // ---- board game ----
  position: number;
  coins: Coins;
  /** turns this player must sit out (RADIKAL) */
  skipTurns: number;
  eliminated: boolean;
  /** character power uses left (manual: 2 per game) */
  powersLeft: number;
}

export type DeckId = "asas" | "ion" | "kovalen" | "drum";

/** A question as the players see it. The answer key never leaves the server. */
export interface PublicQuestion {
  id: string;
  deck: DeckId;
  prompt: string;
  options: string[];
}

export type Stage =
  | { kind: "roll" }
  | { kind: "choice"; square: "radikal" | "gangguan"; canPay: boolean; deadline: number }
  | {
      kind: "question";
      question: PublicQuestion;
      /** who must answer: the current player, or the player Mystra challenged */
      answererId: string;
      challengedBy?: string;
      deadline: number;
    }
  /** Quark landed on ION/KOVALEN: may use the power to see 3 cards and choose one */
  | { kind: "quarkPick"; deck: DeckId; revealed: boolean; options: PublicQuestion[]; deadline: number }
  /** Someone answered an ION/KOVALEN card correctly: Calco may block the reward */
  | { kind: "calcoWindow"; answererId: string; calcoId: string; question: PublicQuestion; deadline: number }
  | { kind: "drumQuestion"; question: PublicQuestion; answered: string[]; deadline: number }
  | { kind: "result"; result: TurnResult; deadline: number };

export interface TurnResult {
  playerId: string;
  title: string;
  lines: string[];
  question?: PublicQuestion;
  correctIndex?: number;
  /** player id → option index they picked (null = no answer / time out) */
  answers?: Record<string, number | null>;
  /** player id → change in coin points this turn */
  deltas: Record<string, number>;
}

export interface LogEntry {
  at: number;
  text: string;
}

export interface GameState {
  startedAt: number;
  endsAt: number;
  /** index into RoomState.turnOrder */
  turnIndex: number;
  turnNumber: number;
  stage: Stage;
  /** draw piles of card ids. Server-only: stripped before sending to players. */
  decks?: Record<DeckId, string[]>;
  log: LogEntry[];
  lastMove: { playerId: string; from: number; to: number; roll: number; at: number } | null;
  /** filled when the game ends */
  winnerIds: string[];
  endReason: "time" | "lastPlayer" | null;
}

export interface RoomState {
  code: string;
  /** false until someone sends a "create" message for this code */
  created: boolean;
  phase: Phase;
  hostId: string | null;
  /** in join order */
  players: Player[];
  /** 1 = first roll, 2+ = tie-break rounds */
  rollRound: number;
  /** player ids, highest roll first. Filled when rolling ends. */
  turnOrder: string[];
  /** index into turnOrder of who is picking a character right now */
  pickIndex: number;
  game: GameState | null;
}

export type ClientMessage =
  | { type: "create"; playerId: string; name: string }
  | { type: "join"; playerId: string; name: string }
  | { type: "setReady"; ready: boolean }
  | { type: "start" }
  | { type: "roll" }
  | { type: "pickCharacter"; character: CharacterId }
  | { type: "answer"; choice: number }
  | { type: "choose"; option: "pay" | "decline" }
  /** use your character's power; Ghoston and Mystra pick a target */
  | { type: "usePower"; targetId?: string }
  /** decline a power offer (Quark: draw normally, Calco: let the reward through) */
  | { type: "skipPower" }
  /** Quark picks one of the revealed cards */
  | { type: "pickQuestion"; index: number }
  | { type: "kick"; playerId: string }
  /** host acts for a disconnected player so the game is not stuck */
  | { type: "actFor"; playerId: string }
  | { type: "playAgain" }
  | { type: "leave" };

export type ErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_EXISTS"
  | "ROOM_FULL"
  | "GAME_STARTED"
  | "NAME_INVALID"
  | "NAME_TAKEN"
  | "NOT_JOINED"
  | "NOT_HOST"
  | "NOT_ALLOWED"
  | "NOT_YOUR_TURN"
  | "CHARACTER_TAKEN"
  | "BAD_MESSAGE";

export type GameEvent =
  | { type: "rolled"; playerId: string; value: number; round: number }
  | { type: "tie"; playerIds: string[]; round: number }
  | { type: "turnOrderDecided"; turnOrder: string[] }
  | { type: "picked"; playerId: string; character: CharacterId }
  | { type: "kicked"; playerId: string }
  | { type: "moved"; playerId: string; from: number; to: number; roll: number; passedReaksi: boolean }
  | { type: "drumCard"; playerId: string; text: string }
  | { type: "power"; playerId: string; text: string }
  | { type: "eliminated"; playerId: string };

export type ServerMessage =
  /** `now` is the server clock, so screens can show accurate countdowns */
  | { type: "state"; state: RoomState; now: number }
  | { type: "event"; event: GameEvent }
  | { type: "error"; code: ErrorCode; message: string };
