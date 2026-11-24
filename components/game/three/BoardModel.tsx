"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BOARD, SQUARE_COLOR, SQUARE_NAME, type Square } from "@/shared/board.ts";
import type { Lang } from "@/shared/i18n.ts";
import type { DeckId } from "@/shared/types.ts";
import { TileIcon } from "./TileIcons";
import { cardFaceTexture, centerTexture, deckTexture, stripTexture, textTexture } from "./textures";

// ---------------------------------------------------------------- layout

/** Tile size in 3D units. The board is 8 tiles wide and 5 tiles deep. */
export const TW = 1.75;
export const TD = 1.75;
const GAP = 0.08;
export const COLS = 8;
export const ROWS = 5;
export const BOARD_W = COLS * TW + 0.7;
export const BOARD_D = ROWS * TD + 0.7;
const TILE_H = 0.16;
/** Height of a tile's top surface: tokens stand here. */
export const TILE_TOP = TILE_H;

export function cellCenter(col: number, row: number): [number, number, number] {
  return [(col - (COLS - 1) / 2) * TW, TILE_TOP, (row - (ROWS - 1) / 2) * TD];
}

/** World position of a square, plus an offset (fractions of a tile) when several tokens share it. */
export function squareToWorld(index: number, dx = 0, dy = 0): [number, number, number] {
  const sq = BOARD[index];
  const [x, y, z] = cellCenter(sq.col, sq.row);
  return [x + dx * TW, y, z + dy * TD];
}

/** Which side of the tile faces the middle of the board (where the coloured strip goes). */
function innerSide(sq: Square): "top" | "bottom" | "left" | "right" | null {
  const corner = (sq.col === 0 || sq.col === COLS - 1) && (sq.row === 0 || sq.row === ROWS - 1);
  if (corner) return null;
  if (sq.row === ROWS - 1) return "top";
  if (sq.row === 0) return "bottom";
  if (sq.col === 0) return "right";
  return "left";
}

const TEXT_ON: Record<string, string> = { kovalen: "#3a2a00", ion: "#ffffff", asas: "#ffffff", drum: "#ffffff" };

export const DECK_COLOR: Record<DeckId, string> = {
  ion: "#ff7a1a",
  kovalen: "#ffd21f",
  asas: "#22a855",
  drum: "#ef3b2d",
};

/** Where each deck sits in the middle of the board (mirrors the printed board). */
export const DECK_POS: Record<DeckId, [number, number]> = {
  ion: [-3.6, -1.1],
  kovalen: [3.6, -1.1],
  drum: [-1.9, 1.45],
  asas: [1.9, 1.45],
};

// ---------------------------------------------------------------- board

export function BoardModel({ drawn, lang }: { drawn: { deck: DeckId; key: number } | null; lang: Lang }) {
  const center = useMemo(() => centerTexture(), []);
  const title = useMemo(
    () =>
      textTexture([
        { text: "CHEMVENTURE", size: 120, color: "#ffd84d" },
        { text: "THE SIEGE OF BONDS", size: 56, color: "#e9e4ff" },
      ]),
    [],
  );

  return (
    <group>
      {/* base */}
      <RoundedBox args={[BOARD_W, 0.4, BOARD_D]} radius={0.18} smoothness={4} position={[0, -0.2, 0]} receiveShadow>
        <meshStandardMaterial color="#5145c9" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[BOARD_W + 0.3, 0.06, BOARD_D + 0.3]} />
        <meshStandardMaterial color="#ffb300" emissive="#ff9a00" emissiveIntensity={0.25} />
      </mesh>

      {/* middle area */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[(COLS - 2) * TW - GAP, (ROWS - 2) * TD - GAP]} />
        <meshStandardMaterial map={center} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.012, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.6, 1.15]} />
        <meshBasicMaterial map={title} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <Atom position={[0, 0, -1.3]} />

      {(Object.keys(DECK_POS) as DeckId[]).map((d) => (
        <Deck key={d} deck={d} lang={lang} drawKey={drawn?.deck === d ? drawn.key : undefined} />
      ))}

      {BOARD.map((sq) => (
        <Tile key={sq.index} sq={sq} lang={lang} />
      ))}
    </group>
  );
}

function Tile({ sq, lang }: { sq: Square; lang: Lang }) {
  const label = SQUARE_NAME[sq.type][lang];
  const [x, , z] = cellCenter(sq.col, sq.row);
  const side = innerSide(sq);
  const isCorner = side === null;
  const strip = useMemo(
    () => (side ? stripTexture(label, SQUARE_COLOR[sq.type], TEXT_ON[sq.type] ?? "#fff") : null),
    [side, sq.type, label],
  );
  const cornerLabel = useMemo(
    () => (isCorner ? textTexture([{ text: label, size: 110, color: "#ffffff" }], 1024, 200) : null),
    [isCorner, label],
  );

  // Strip along the inner edge; text reads from outside the board.
  const STRIP = 0.34;
  let stripPos: [number, number] = [0, 0];
  let stripSize: [number, number] = [TW - GAP, STRIP];
  let stripRot = 0;
  let iconOffset: [number, number] = [0, 0];
  if (side === "top") { stripPos = [0, -(TD - GAP) / 2 + STRIP / 2]; iconOffset = [0, 0.18]; }
  if (side === "bottom") { stripPos = [0, (TD - GAP) / 2 - STRIP / 2]; stripRot = Math.PI; iconOffset = [0, -0.18]; }
  if (side === "right") { stripPos = [(TW - GAP) / 2 - STRIP / 2, 0]; stripSize = [TD - GAP, STRIP]; stripRot = Math.PI / 2; iconOffset = [-0.18, 0]; }
  if (side === "left") { stripPos = [-(TW - GAP) / 2 + STRIP / 2, 0]; stripSize = [TD - GAP, STRIP]; stripRot = -Math.PI / 2; iconOffset = [0.18, 0]; }

  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[TW - GAP, TILE_H, TD - GAP]} radius={0.06} smoothness={3} position={[0, TILE_H / 2, 0]} receiveShadow>
        <meshStandardMaterial color={isCorner ? "#f3f0ff" : "#fbfaff"} roughness={0.55} />
      </RoundedBox>
      {strip && (
        <mesh position={[stripPos[0], TILE_TOP + 0.004, stripPos[1]]} rotation={[-Math.PI / 2, 0, stripRot]}>
          <planeGeometry args={stripSize} />
          <meshStandardMaterial map={strip} roughness={0.6} />
        </mesh>
      )}
      {cornerLabel && (
        <mesh position={[0, TILE_TOP + 0.004, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.3]} />
          <meshBasicMaterial map={cornerLabel} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <group position={[iconOffset[0], TILE_TOP, iconOffset[1] - (isCorner ? 0.1 : 0)]} scale={isCorner ? 1.25 : 1}>
        <TileIcon type={sq.type} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- atom in the middle

function Atom({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const electrons = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) ref.current.rotation.y = t * 0.3;
    electrons.current.forEach((e, i) => {
      if (e) e.rotation.z = t * (1.2 + i * 0.35) + i;
    });
  });
  const rings = [0, Math.PI / 3, -Math.PI / 3];
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.15, 64]} />
        <meshBasicMaterial color="#ffd84d" transparent opacity={0.55} />
      </mesh>
      <group ref={ref} position={[0, 0.85, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.36, 40, 28]} />
          <meshStandardMaterial color="#ffc21a" emissive="#ff9a00" emissiveIntensity={0.45} metalness={0.3} roughness={0.25} />
        </mesh>
        {rings.map((r, i) => (
          <group key={i} rotation={[Math.PI / 2, r, 0]}>
            <mesh>
              <torusGeometry args={[0.78, 0.025, 12, 80]} />
              <meshStandardMaterial color="#ffe27a" emissive="#ffb000" emissiveIntensity={0.4} />
            </mesh>
            <group ref={(g) => { if (g) electrons.current[i] = g; }}>
              <mesh position={[0.78, 0, 0]} castShadow>
                <sphereGeometry args={[0.12, 20, 14]} />
                <meshStandardMaterial color={["#6366f1", "#8b5cf6", "#3b82f6"][i]} emissive="#4f46e5" emissiveIntensity={0.4} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- card decks

const CARD_W = 1.45;
const CARD_D = 1.0;
const CARD_T = 0.028;
const STACK = 8;
const DRAW_S = 1.1;

function Deck({ deck, drawKey, lang }: { deck: DeckId; drawKey?: number; lang: Lang }) {
  const label = SQUARE_NAME[deck][lang];
  const color = DECK_COLOR[deck];
  const top = useMemo(() => deckTexture(label, color, deck === "kovalen" ? "#3a2a00" : "#ffffff"), [deck, color, label]);
  const face = useMemo(() => cardFaceTexture(color), [color]);
  const [x, z] = DECK_POS[deck];
  const flying = useRef<THREE.Group>(null);
  const t = useRef(99);

  // A card was drawn from this deck: lift it, flip it, fade it out.
  useEffect(() => {
    if (drawKey) t.current = 0;
  }, [drawKey]);

  useFrame((_, dt) => {
    const g = flying.current;
    if (!g) return;
    if (t.current > DRAW_S) {
      g.visible = false;
      return;
    }
    t.current += dt;
    const k = Math.min(1, t.current / DRAW_S);
    g.visible = true;
    g.position.y = STACK * CARD_T + Math.sin(k * Math.PI) * 1.6 + k * 0.6;
    g.rotation.x = -k * Math.PI; // flip over
    g.rotation.z = Math.sin(k * Math.PI) * 0.25;
    const s = 1 + k * 0.35;
    g.scale.set(s, s, s);
  });

  return (
    <group position={[x, 0.01, z]} rotation={[0, deck === "ion" ? 0.08 : deck === "kovalen" ? -0.08 : 0, 0]}>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CARD_W + 0.35, CARD_D + 0.35]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
      </mesh>
      {Array.from({ length: STACK }, (_, i) => (
        <mesh key={i} position={[(i % 2) * 0.012, CARD_T / 2 + i * CARD_T, (i % 3) * 0.008]} castShadow receiveShadow>
          <boxGeometry args={[CARD_W, CARD_T * 0.9, CARD_D]} />
          <meshStandardMaterial color={i % 2 ? color : "#fbf8ff"} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.012, STACK * CARD_T + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CARD_W, CARD_D]} />
        <meshStandardMaterial map={top} roughness={0.5} />
      </mesh>
      {/* the card that flies up when drawn */}
      <group ref={flying} visible={false}>
        <mesh>
          <boxGeometry args={[CARD_W, CARD_T, CARD_D]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, CARD_T / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CARD_W, CARD_D]} />
          <meshStandardMaterial map={top} />
        </mesh>
        <mesh position={[0, -CARD_T / 2 - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CARD_W, CARD_D]} />
          <meshStandardMaterial map={face} />
        </mesh>
      </group>
    </group>
  );
}
