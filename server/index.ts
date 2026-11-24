/**
 * ChemVenture realtime server: one Durable Object per room code.
 * This server is the single source of truth. It rolls dice and applies rules;
 * browsers only send intents and render the state they get back.
 */
import { routePartykitRequest, Server, type Connection, type WSMessage } from "partyserver";
import * as rules from "../shared/rules.ts";
import type { ClientMessage, ErrorCode, GameEvent, RoomState, ServerMessage } from "../shared/types.ts";

interface Env {
  ChemRoom: DurableObjectNamespace<ChemRoom>;
  [key: string]: unknown;
}

/** Remembered per socket so we know which player a connection belongs to. */
type ConnState = { playerId: string };

const STORAGE_KEY = "state";
const TICK_MS = 5_000;
const MAX_MESSAGE_BYTES = 2_048;

export class ChemRoom extends Server<Env> {
  private state!: RoomState;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  async onStart() {
    const saved = await this.ctx.storage.get<RoomState>(STORAGE_KEY);
    this.state = saved ?? rules.createInitialState(this.name.toUpperCase());
    // After a restart nobody is connected yet; start their grace period now.
    const now = Date.now();
    for (const p of this.state.players) {
      if (p.connected) {
        p.connected = false;
        p.disconnectedAt = now;
      }
    }
  }

  onConnect(conn: Connection<ConnState>) {
    // Nothing to send until the client says create/join; but let them see the room status.
    this.send(conn, { type: "state", state: this.state });
    this.ensureTicking();
  }

  async onMessage(conn: Connection<ConnState>, raw: WSMessage) {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) {
      return this.error(conn, "BAD_MESSAGE", "Mesej tidak sah.");
    }
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.error(conn, "BAD_MESSAGE", "Mesej tidak sah.");
    }
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
      return this.error(conn, "BAD_MESSAGE", "Mesej tidak sah.");
    }

    // create/join bind the socket to a player id; everything else needs that binding.
    if (msg.type === "create" || msg.type === "join") {
      if (typeof msg.playerId !== "string" || msg.playerId.length < 8 || msg.playerId.length > 64) {
        return this.error(conn, "BAD_MESSAGE", "ID pemain tidak sah.");
      }
      const result =
        msg.type === "create"
          ? rules.createRoom(this.state, msg.playerId, msg.name)
          : rules.joinRoom(this.state, msg.playerId, msg.name);
      if (!result.ok) return this.error(conn, result.code, result.message);
      // One live socket per player: close any older tab for the same player.
      for (const other of this.getConnections<ConnState>()) {
        if (other.id !== conn.id && other.state?.playerId === msg.playerId) {
          other.setState(null as unknown as ConnState);
          other.close(4000, "Opened in another tab");
        }
      }
      conn.setState({ playerId: msg.playerId });
      return this.commit(result.state, result.events);
    }

    const playerId = conn.state?.playerId;
    if (!playerId) return this.error(conn, "NOT_JOINED", "Anda belum menyertai bilik.");

    let result: rules.Result;
    switch (msg.type) {
      case "setReady":
        result = rules.setReady(this.state, playerId, msg.ready === true);
        break;
      case "start":
        result = rules.startGame(this.state, playerId);
        break;
      case "roll":
        result = rules.roll(this.state, playerId, rollDie());
        break;
      case "pickCharacter":
        result = rules.pickCharacter(this.state, playerId, msg.character);
        break;
      case "kick":
        result = rules.kick(this.state, playerId, String(msg.playerId));
        if (result.ok) this.closePlayer(String(msg.playerId), 4001, "Kicked by host");
        break;
      case "actFor":
        result = rules.actFor(this.state, playerId, String(msg.playerId), rollDie());
        break;
      case "leave":
        result = rules.leaveRoom(this.state, playerId, Date.now());
        if (result.ok) conn.setState(null as unknown as ConnState);
        break;
      default:
        return this.error(conn, "BAD_MESSAGE", "Jenis mesej tidak dikenali.");
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

  // ---- helpers ------------------------------------------------------------

  private async commit(next: RoomState, events: GameEvent[]) {
    this.state = next;
    await this.ctx.storage.put(STORAGE_KEY, next);
    for (const event of events) this.broadcastMsg({ type: "event", event });
    this.broadcastMsg({ type: "state", state: next });
  }

  private ensureTicking() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(async () => {
      const next = rules.tick(this.state, Date.now());
      if (next !== this.state) await this.commit(next, []);
      if ([...this.getConnections()].length === 0 && this.tickTimer) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }
    }, TICK_MS);
  }

  private closePlayer(playerId: string, code: number, reason: string) {
    for (const c of this.getConnections<ConnState>()) {
      if (c.state?.playerId === playerId) {
        this.send(c, { type: "error", code: "NOT_JOINED", message: "Anda telah dikeluarkan oleh hos." });
        c.setState(null as unknown as ConnState);
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
  private error(conn: Connection, code: ErrorCode, message: string) {
    this.send(conn, { type: "error", code, message });
  }
}

function rollDie(): number {
  // Rejection sampling for an unbiased 1..6.
  const buf = new Uint8Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= 252);
  return (buf[0] % 6) + 1;
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
