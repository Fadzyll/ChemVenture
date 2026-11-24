"use client";

import { PartySocket } from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Text } from "@/shared/i18n.ts";
import type { ClientMessage, ErrorCode, GameEvent, RoomState, ServerMessage } from "@/shared/types.ts";
import { getPlayerId } from "./identity";

export const GAME_SERVER_HOST = process.env.NEXT_PUBLIC_GAME_SERVER_HOST || "localhost:8787";

/** How long we keep quietly reconnecting before telling the player the server is unavailable. */
export const UNAVAILABLE_AFTER_MS = 15_000;

export type ConnectionStatus = "connecting" | "open" | "closed" | "replaced" | "kicked";

export interface RoomError {
  code: ErrorCode;
  message: Text;
  at: number;
}

export function useRoom(code: string, onEvent?: (e: GameEvent) => void) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<RoomError | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  /** true once we've failed to reach the server for UNAVAILABLE_AFTER_MS */
  const [unavailable, setUnavailable] = useState(false);
  const [playerId, setPlayerId] = useState<string>("");
  const socketRef = useRef<PartySocket | null>(null);
  /** server clock minus local clock, so countdowns match on every device */
  const offsetRef = useRef(0);
  /** What to send on every (re)connect so the server knows who this socket is. */
  const joinRef = useRef<ClientMessage | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    setPlayerId(getPlayerId());
    const socket = new PartySocket({ host: GAME_SERVER_HOST, party: "chem-room", room: code });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setStatus("open");
      if (joinRef.current) socket.send(JSON.stringify(joinRef.current));
    });
    socket.addEventListener("close", (e: CloseEvent) => {
      if (e.code === 4000 || e.code === 4001) {
        // Replaced by another tab, or kicked: stop auto-reconnecting.
        joinRef.current = null;
        setStatus(e.code === 4000 ? "replaced" : "kicked");
        socket.close();
      } else {
        setStatus((s) => (s === "replaced" || s === "kicked" ? s : "closed"));
      }
    });
    socket.addEventListener("message", (e: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "state") {
        if (typeof msg.now === "number") offsetRef.current = msg.now - Date.now();
        setState(msg.state);
      }
      else if (msg.type === "event") onEventRef.current?.(msg.event);
      else if (msg.type === "error") setError({ code: msg.code, message: msg.message, at: Date.now() });
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [code]);

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  /** Create or join. After the first success, reconnects re-send this automatically. */
  const enter = useCallback(
    (name: string, mode: "create" | "join") => {
      const msg: ClientMessage = { type: mode, playerId: getPlayerId(), name };
      joinRef.current = msg;
      setError(null);
      // If the socket isn't open yet, the "open" handler sends it.
      if (socketRef.current?.readyState === WebSocket.OPEN) send(msg);
    },
    [send],
  );

  /** Stop re-sending join on reconnect (after leave, or when joining failed). */
  const forget = useCallback(() => {
    joinRef.current = null;
  }, []);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  const me = state?.players.find((p) => p.id === playerId) ?? null;

  // Not connected for a while (and not kicked / replaced): tell the player the server is unavailable.
  useEffect(() => {
    if (status === "open") {
      setUnavailable(false);
      return;
    }
    if (status === "kicked" || status === "replaced") return;
    const t = setTimeout(() => setUnavailable(true), UNAVAILABLE_AFTER_MS);
    return () => clearTimeout(t);
  }, [status]);

  const retry = useCallback(() => socketRef.current?.reconnect(), []);

  return { state, me, playerId, status, unavailable, retry, error, setError, send, enter, forget, serverNow };
}
