"use client";

import { useRef } from "react";
import { CODE_ALPHABET, CODE_LENGTH } from "@/shared/roomCode.ts";

/**
 * Room code entry as separate boxes (like a one-time code). Typing moves to the next box,
 * Backspace moves back, and pasting a whole code fills every box.
 */
export default function CodeInput({
  value,
  onChange,
  onComplete,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: () => void;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const clean = (s: string) =>
    s
      .toUpperCase()
      .split("")
      .filter((c) => CODE_ALPHABET.includes(c))
      .join("");

  const setAt = (i: number, chars: string) => {
    const arr = value.padEnd(CODE_LENGTH, " ").split("");
    let j = i;
    for (const c of clean(chars)) {
      if (j >= CODE_LENGTH) break;
      arr[j++] = c;
    }
    const next = arr.join("").replace(/\s+$/, "").replace(/ /g, "");
    onChange(next.slice(0, CODE_LENGTH));
    const focusAt = Math.min(j, CODE_LENGTH - 1);
    refs.current[focusAt]?.focus();
    if (next.length >= CODE_LENGTH) onComplete?.();
  };

  return (
    <div className={`code-boxes ${invalid ? "invalid" : ""}`} role="group" aria-label="Kod bilik">
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="code-box"
          value={value[i] ?? ""}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={CODE_LENGTH}
          aria-label={`Aksara ${i + 1}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value;
            if (!typed) {
              onChange((value.slice(0, i) + value.slice(i + 1)).slice(0, CODE_LENGTH));
              return;
            }
            setAt(i, typed.slice(-CODE_LENGTH));
          }}
          onPaste={(e) => {
            e.preventDefault();
            setAt(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              e.preventDefault();
              onChange(value.slice(0, i - 1));
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
