"use client";

import { Billboard, Html, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BOARD, BOARD_IMAGE } from "@/shared/board.ts";
import { CHARACTERS, CHARACTER_IDS } from "@/shared/characters.ts";
import type { Player } from "@/shared/types.ts";
import { STEP_MS, tokenOffset, useShownPositions, type MoveAnim } from "./useShownPositions";

// Board size in 3D units (width along x, depth along z).
const W = 14;
const H = W / BOARD_IMAGE.aspect;
const THICK = 0.35;

/** Centre of a square (plus an offset inside it), in 3D coordinates on the board's top face. */
function squareToWorld(index: number, dx = 0, dy = 0): [number, number, number] {
  const sq = BOARD[index];
  const fx = BOARD_IMAGE.left + BOARD_IMAGE.cellW * (sq.col + 0.5 + dx);
  const fy = BOARD_IMAGE.top + BOARD_IMAGE.cellH * (sq.row + 0.5 + dy);
  return [(fx - 0.5) * W, 0, (fy - 0.5) * H];
}

export interface Board3DProps {
  players: Player[];
  currentId: string | null;
  move: MoveAnim | null;
  /** latest dice roll to animate */
  roll: { value: number; key: number } | null;
  lastRoll: number | null;
  /** coin changes to pop up over tokens (shown while a turn result is on screen) */
  deltas: { values: Record<string, number>; key: number } | null;
}

export default function Board3D(props: Board3DProps) {
  const [canRotate, setCanRotate] = useState(false);
  useEffect(() => setCanRotate(window.matchMedia("(pointer: fine)").matches), []);

  return (
    <div className="board3d">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 14, 8.2], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[6, 14, 8]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[0, 4, 0]} intensity={8} color="#c77dff" distance={14} />
        <CameraFit />
        <Stars radius={60} depth={30} count={2500} factor={3} fade speed={0.6} />
        <Suspense fallback={null}>
          <BoardMesh />
          <Scene {...props} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableRotate={canRotate}
          minDistance={9}
          maxDistance={32}
          minPolarAngle={0.15}
          maxPolarAngle={1.2}
          target={[0, 0, 0.6]}
        />
      </Canvas>
      {canRotate && <div className="board3d-hint">Seret untuk memutar · tatal untuk zum</div>}
    </div>
  );
}

/** Pull the camera back on narrow screens so the whole board stays in view. */
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const dist = 16.2 * Math.max(1, 1.55 / aspect);
    const dir = new THREE.Vector3(0, 14, 8.2).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0.6);
  }, [camera, size.width, size.height]);
  return null;
}

function BoardMesh() {
  const tex = useTexture(BOARD_IMAGE.src);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }, [tex]);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1366", roughness: 0.6 }), []);
  const top = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }), [tex]);
  // Box faces: +x, -x, +y (top), -y, +z, -z
  const materials = useMemo(() => [side, side, top, side, side, side], [side, top]);
  return (
    <group>
      <mesh position={[0, -THICK / 2, 0]} material={materials} receiveShadow castShadow>
        <boxGeometry args={[W, THICK, H]} />
      </mesh>
      {/* glowing frame under the board */}
      <mesh position={[0, -THICK - 0.06, 0]}>
        <boxGeometry args={[W + 0.6, 0.12, H + 0.6]} />
        <meshStandardMaterial color="#120634" emissive="#6a2bd9" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Scene({ players, currentId, move, roll, lastRoll, deltas }: Board3DProps) {
  const shown = useShownPositions(players, move);
  const onBoard = players.filter((p) => !p.eliminated);

  // Group tokens by square so several players on one square stand side by side.
  const groups = new Map<number, Player[]>();
  for (const p of onBoard) {
    const pos = shown[p.id] ?? p.position;
    groups.set(pos, [...(groups.get(pos) ?? []), p]);
  }
  const placed: { player: Player; at: [number, number, number] }[] = [];
  for (const [pos, group] of groups) {
    group.forEach((p, i) => {
      const { dx, dy } = tokenOffset(i, group.length);
      placed.push({ player: p, at: squareToWorld(pos, dx, dy) });
    });
  }

  const current = players.find((p) => p.id === currentId);
  const currentSquare = current && !current.eliminated ? (shown[current.id] ?? current.position) : null;

  return (
    <>
      {currentSquare !== null && <Highlight index={currentSquare} />}
      {placed.map(({ player, at }) => (
        <Token
          key={player.id}
          player={player}
          target={at}
          active={player.id === currentId}
          delta={deltas?.values[player.id]}
          deltaKey={deltas?.key}
        />
      ))}
      <Dice value={roll?.value ?? lastRoll} rollKey={roll?.key} />
    </>
  );
}

function Highlight({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, , z] = squareToWorld(index);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.15;
  });
  return (
    <mesh ref={ref} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[BOARD_IMAGE.cellW * W * 0.96, BOARD_IMAGE.cellH * H * 0.96]} />
      <meshBasicMaterial color="#ffcf3f" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- tokens

function Token({
  player,
  target,
  active,
  delta,
  deltaKey,
}: {
  player: Player;
  target: [number, number, number];
  active: boolean;
  delta?: number;
  deltaKey?: number;
}) {
  const c = player.character ? CHARACTERS[player.character] : null;
  const group = useRef<THREE.Group>(null);
  const figure = useRef<THREE.Group>(null);
  const anim = useRef({ from: new THREE.Vector3(...target), to: new THREE.Vector3(...target), t: 1, key: target.join() });

  // A new target square: hop from wherever the token is now.
  const key = target.join();
  if (anim.current.key !== key) {
    const now = group.current ? group.current.position.clone() : new THREE.Vector3(...target);
    now.y = 0;
    anim.current = { from: now, to: new THREE.Vector3(...target), t: 0, key };
  }

  useFrame(({ clock }, dt) => {
    const a = anim.current;
    if (!group.current) return;
    if (a.t < 1) a.t = Math.min(1, a.t + dt / ((STEP_MS / 1000) * 0.9));
    const ease = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
    group.current.position.lerpVectors(a.from, a.to, ease);
    group.current.position.y = Math.sin(a.t * Math.PI) * 0.7; // hop
    if (figure.current) {
      // idle bob for the active player
      figure.current.position.y = active && a.t >= 1 ? 0.08 + Math.sin(clock.elapsedTime * 4) * 0.08 : 0;
    }
  });

  const color = player.connected ? (c?.color ?? "#ffffff") : "#777777";
  return (
    <group ref={group} position={target}>
      {/* base */}
      <mesh castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 0.12, 32]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
      </mesh>
      {active && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.55, 40]} />
          <meshBasicMaterial color="#ffcf3f" transparent opacity={0.9} />
        </mesh>
      )}
      <group ref={figure}>
        {/* Faces the camera fully (like a card held up), so it reads well even from above */}
        <Billboard position={[0, 0.12, 0]}>
          {c ? <Standee characterId={c.id} dim={!player.connected} /> : null}
        </Billboard>
      </group>
      <Html position={[0, 2.25, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
        <div className={`token3d-label ${active ? "active" : ""}`}>{player.name}</div>
        {delta !== undefined && delta !== 0 && (
          <div key={deltaKey} className={`token3d-delta ${delta > 0 ? "up" : "down"}`}>
            {delta > 0 ? `+${delta}` : delta}
          </div>
        )}
      </Html>
    </group>
  );
}

const STANDEE_H = 1.9;

function Standee({ characterId, dim }: { characterId: (typeof CHARACTER_IDS)[number]; dim: boolean }) {
  const tex = useTexture(CHARACTERS[characterId].image);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 0.38;
  const w = STANDEE_H * aspect;
  return (
    <mesh position={[0, STANDEE_H / 2, 0]} castShadow>
      <planeGeometry args={[w, STANDEE_H]} />
      {/* unlit, so the character art keeps its real colours from any camera angle */}
      <meshBasicMaterial
        map={tex}
        transparent
        alphaTest={0.15}
        side={THREE.DoubleSide}
        color={dim ? "#777777" : "#ffffff"}
        toneMapped={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------- dice

const DIE = 0.9;
/** Box face order: +x, -x, +y, -y, +z, -z. Opposite faces add up to 7. */
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
/** Rotation that brings each value's face to the top. */
const FACE_UP: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
};
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};

function faceTexture(value: number): THREE.CanvasTexture {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#fdfbff";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#1d0f45";
  for (const [x, y] of PIPS[value]) {
    g.beginPath();
    g.arc(x * size, y * size, size * 0.09, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const REST_Y = DIE / 2;
const SPIN_S = 0.9;
const SETTLE_S = 0.45;

function Dice({ value, rollKey }: { value: number | null; rollKey?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const materials = useMemo(
    () => FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({ map: faceTexture(v), roughness: 0.35 })),
    [],
  );
  const anim = useRef({ t: 99, target: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0), start: new THREE.Quaternion() });

  // Start a tumble whenever a new roll arrives; it lands on the value the server rolled.
  useEffect(() => {
    if (!rollKey || !value) return;
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    anim.current = {
      t: 0,
      target: yaw.multiply(new THREE.Quaternion().setFromEuler(FACE_UP[value])),
      axis: new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.3, Math.random() - 0.5).normalize(),
      start: new THREE.Quaternion(),
    };
  }, [rollKey, value]);

  // Without an animation, just show the last value face-up.
  useEffect(() => {
    if (ref.current && value && anim.current.t >= SPIN_S + SETTLE_S) {
      ref.current.quaternion.setFromEuler(FACE_UP[value]);
    }
  }, [value]);

  useFrame((_, dt) => {
    const m = ref.current;
    const a = anim.current;
    if (!m || a.t >= SPIN_S + SETTLE_S) return;
    a.t += dt;
    if (a.t < SPIN_S) {
      const speed = 16 * (1 - a.t / SPIN_S) + 4;
      m.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(a.axis, speed * dt));
      m.position.y = REST_Y + Math.sin((a.t / SPIN_S) * Math.PI) * 2.2;
      a.start.copy(m.quaternion);
    } else {
      const k = Math.min(1, (a.t - SPIN_S) / SETTLE_S);
      const ease = 1 - Math.pow(1 - k, 3);
      m.quaternion.slerpQuaternions(a.start, a.target, ease);
      m.position.y = REST_Y + Math.abs(Math.sin(k * Math.PI * 2)) * 0.25 * (1 - k); // little bounce
    }
  });

  if (!value) return null;
  return (
    <mesh ref={ref} position={[0, REST_Y, 0.2]} material={materials} castShadow>
      <boxGeometry args={[DIE, DIE, DIE]} />
    </mesh>
  );
}
