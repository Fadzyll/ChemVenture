import type { CharacterId } from "./characters.ts";

export const MAX_PLAYERS = 5;
export const MIN_PLAYERS = 2;
export const NAME_MAX_LENGTH = 16;
/** How long a disconnected player keeps their seat in the lobby / host role. */
export const DISCONNECT_GRACE_MS = 20_000;

export type Phase =
  | "lobby" // players join, enter names, press ready
  | "rolling" // everyone rolls to decide turn order (ties re-roll and add)
  | "picking" // highest roller picks a character first, then the next...
  | "playing"; // main game (Phase 3+)

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
}

export type ClientMessage =
  | { type: "create"; playerId: string; name: string }
  | { type: "join"; playerId: string; name: string }
  | { type: "setReady"; ready: boolean }
  | { type: "start" }
  | { type: "roll" }
  | { type: "pickCharacter"; character: CharacterId }
  | { type: "kick"; playerId: string }
  /** host acts for a disconnected player so the game is not stuck */
  | { type: "actFor"; playerId: string }
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
  | { type: "kicked"; playerId: string };

export type ServerMessage =
  | { type: "state"; state: RoomState }
  | { type: "event"; event: GameEvent }
  | { type: "error"; code: ErrorCode; message: string };
