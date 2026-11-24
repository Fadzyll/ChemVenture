/**
 * ChemVenture realtime server: one Durable Object per room code.
 * This server is the single source of truth. It rolls dice, draws cards and applies rules;
 * browsers only send intents and render the state they get back.
 *
 * Hibernation is on: while nobody is doing anything, the room sleeps and uses no
 * Durable Object time. Timers (answer countdowns, the 20-minute clock) use storage alarms,
 * which wake the room up exactly when needed.
 */
import { routePartykitRequest, Server, type Connection, type WSMessage } from "partyserver";
import { tx, type Text } from "../shared/i18n.ts";
import * as rules from "../shared/rules.ts";
import type { ClientMessage, ErrorCode, GameEvent, RoomState, ServerMessage } from "../shared/types.ts";
import * as game from "./game.ts";

interface Env {
  ChemRoom: DurableObjectNamespace<ChemRoom>;
  [key: string]: unknown;
}

/** Remembered per socket (survives hibernation) so we know which player a connection belongs to. */
type ConnState = { playerId: string } | null;

const STORAGE_KEY = "state";
const MAX_MESSAGE_BYTES = 2_048;

const rng: game.Rng = {
  die: () => randomInt(6) + 1,
  shuffle: (items) => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};

export class ChemRoom extends Server<Env> {
  static options = { hibernate: true };

  private state!: RoomState;

  async onStart() {
    const saved = await this.ctx.storage.get<RoomState>(STORAGE_KEY);
    this.state = saved ?? rules.createInitialState(this.name.toUpperCase());
    // Waking up (from hibernation or a restart): trust the sockets that are actually open.
    const live = new Set<string>();
    for (const c of this.getConnections<ConnState>()) if (c.state?.playerId) live.add(c.state.playerId);
    const now = Date.now();
    for (const p of this.state.players) {
      const isLive = live.has(p.id);
      if (p.connected && !isLive) p.disconnectedAt = now;
      if (isLive) p.disconnectedAt = null;
      p.connected = isLive;
    }
  }

  onConnect(conn: Connection<ConnState>) {
    // Let them see the room status before they create/join.
    this.send(conn, { type: "state", state: game.publicState(this.state), now: Date.now() });
  }

  async onMessage(conn: Connection<ConnState>, raw: WSMessage) {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) return this.error(conn, "BAD_MESSAGE", tx("Invalid message.", "Mesej tidak sah."));
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.error(conn, "BAD_MESSAGE", tx("Invalid message.", "Mesej tidak sah."));
    }
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return this.error(conn, "BAD_MESSAGE", tx("Invalid message.", "Mesej tidak sah."));
    const now = Date.now();

    // create/join bind the socket to a player id; everything else needs that binding.
    if (msg.type === "create" || msg.type === "join") {
      if (typeof msg.playerId !== "string" || msg.playerId.length < 8 || msg.playerId.length > 64) {
        return this.error(conn, "BAD_MESSAGE", tx("Invalid player ID.", "ID pemain tidak sah."));
      }
      const result =
        msg.type === "create"
          ? rules.createRoom(this.state, msg.playerId, msg.name)
          : rules.joinRoom(this.state, msg.playerId, msg.name);
      if (!result.ok) return this.error(conn, result.code, result.message);
      // One live socket per player: close any older tab for the same player.
      for (const other of this.getConnections<ConnState>()) {
        if (other.id !== conn.id && other.state?.playerId === msg.playerId) {
          other.setState(null);
          other.close(4000, "Opened in another tab");
        }
      }
      conn.setState({ playerId: msg.playerId });
      return this.commit(result.state, result.events);
    }

    const playerId = conn.state?.playerId;
    if (!playerId) return this.error(conn, "NOT_JOINED", tx("You haven't joined this room.", "Anda belum menyertai bilik."));

    let result: rules.Result;
    const s = this.state;
    switch (msg.type) {
      case "setReady":
        result = rules.setReady(s, playerId, msg.ready === true);
        break;
      case "start":
        result = rules.startGame(s, playerId);
        break;
      case "roll":
        result = s.phase === "playing" ? game.roll(s, playerId, now, rng) : rules.roll(s, playerId, rng.die());
        break;
      case "pickCharacter":
        result = rules.pickCharacter(s, playerId, msg.character);
        if (result.ok && result.state.phase === "playing") {
          result = { ...result, state: game.initGame(result.state, now, rng) };
        }
        break;
      case "answer":
        result = game.answer(s, playerId, typeof msg.choice === "number" ? msg.choice : -1, now);
        break;
      case "choose":
        result = game.choose(s, playerId, msg.option, now, rng);
        break;
      case "usePower":
        result = game.usePower(s, playerId, typeof msg.targetId === "string" ? msg.targetId : undefined, now);
        break;
      case "skipPower":
        result = game.skipPower(s, playerId, now);
        break;
      case "pickQuestion":
        result = game.pickQuestion(s, playerId, typeof msg.index === "number" ? msg.index : -1, now);
        break;
      case "kick":
        result = rules.kick(s, playerId, String(msg.playerId));
        if (result.ok) this.closePlayer(String(msg.playerId), 4001, "Kicked by host");
        break;
      case "actFor":
        if (s.phase === "playing") {
          result = game.actFor(s, playerId, String(msg.playerId), now, rng);
        } else {
          result = rules.actFor(s, playerId, String(msg.playerId), rng.die());
          if (result.ok && result.state.phase === "playing") {
            result = { ...result, state: game.initGame(result.state, now, rng) };
          }
        }
        break;
      case "endGame":
        result = game.hostEndGame(s, playerId, now);
        break;
      case "playAgain":
        result = rules.playAgain(s, playerId);
        break;
      case "leave":
        result = rules.leaveRoom(s, playerId, now);
        if (result.ok) conn.setState(null);
        break;
      default:
        return this.error(conn, "BAD_MESSAGE", tx("Unknown message type.", "Jenis mesej tidak dikenali."));
    }
    if (!result.ok) return this.error(conn, result.code, result.message);
    await this.commit(result.state, result.events);
  }

  async onClose(conn: Connection<ConnState>) {
    const playerId = conn.state?.playerId;
    if (!playerId) return;
    // Another socket for this player may still be open (e.g. quick refresh).
    for (const other of this.getConnections<ConnState>()) {
      if (other.id !== conn.id && other.state?.playerId === playerId) return;
    }
    await this.commit(rules.markDisconnected(this.state, playerId, Date.now()), []);
  }

  /** Wakes the room for deadlines: answer timers, the game clock, disconnect grace periods. */
  async onAlarm() {
    const { state, events } = game.advanceTime(this.state, Date.now(), rng);
    if (state !== this.state || events.length > 0) {
      await this.commit(state, events);
    } else {
      // Nothing changed: don't save or broadcast, and only wake again for future deadlines.
      await this.schedule(state, true);
    }
  }

  // ---- helpers ------------------------------------------------------------

  private async commit(next: RoomState, events: GameEvent[]) {
    this.state = next;
    await this.ctx.storage.put(STORAGE_KEY, next);
    await this.schedule(next, false);

    for (const event of events) this.broadcastMsg({ type: "event", event });
    this.broadcastMsg({ type: "state", state: game.publicState(next), now: Date.now() });
  }

  private async schedule(s: RoomState, futureOnly: boolean) {
    const wake = game.nextWakeAt(s, Date.now(), futureOnly);
    if (wake === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(wake, Date.now() + 250));
  }

  private closePlayer(playerId: string, code: number, reason: string) {
    for (const c of this.getConnections<ConnState>()) {
      if (c.state?.playerId === playerId) {
        this.send(c, { type: "error", code: "NOT_JOINED", message: tx("You were removed by the host.", "Anda telah dikeluarkan oleh hos.") });
        c.setState(null);
        c.close(code, reason);
      }
    }
  }

  private send(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }
  private broadcastMsg(msg: ServerMessage) {
    this.broadcast(JSON.stringify(msg));
  }
  private error(conn: Connection, code: ErrorCode, message: Text) {
    this.send(conn, { type: "error", code, message });
  }
}

/** Unbiased random integer in [0, n), n <= 256. */
function randomInt(n: number): number {
  const limit = 256 - (256 % n);
  const buf = new Uint8Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ChemVenture server OK", { headers: { "content-type": "text/plain" } });
    }
    return (await routePartykitRequest(request, env)) ?? new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
