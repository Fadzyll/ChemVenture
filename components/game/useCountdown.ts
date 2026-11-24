"use client";

import { useEffect, useState } from "react";

/** Milliseconds left until `deadline` (server time), re-rendering a few times a second. */
export function useCountdown(deadline: number | null | undefined, serverNow: () => number): number {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, deadline - serverNow()) : 0));
  useEffect(() => {
    if (!deadline) return;
    const update = () => setLeft(Math.max(0, deadline - serverNow()));
    update();
    const t = setInterval(update, 250);
    return () => clearInterval(t);
  }, [deadline, serverNow]);
  return left;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
