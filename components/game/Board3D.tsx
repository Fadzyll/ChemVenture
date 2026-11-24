"use client";

import { Billboard, Html, OrbitControls, PerformanceMonitor, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CHARACTERS, type CharacterId } from "@/shared/characters.ts";
import type { DeckId, Player } from "@/shared/types.ts";
import { BoardModel, TILE_TOP, TW, squareToWorld } from "./three/BoardModel";
import { STEP_MS, tokenOffset, useShownPositions, type MoveAnim } from "./useShownPositions";

export interface Board3DProps {
  players: Player[];
  currentId: string | null;
  move: MoveAnim | null;
  /** latest dice roll to animate */
  roll: { value: number; key: number } | null;
  lastRoll: number | null;
  /** coin changes to pop up over tokens (shown while a turn result is on screen) */
  deltas: { values: Record<string, number>; key: number } | null;
  /** a card was just drawn from this deck: animate it */
  drawn: { deck: DeckId; key: number } | null;
}

type CamView = "iso" | "top" | "side" | "focus";
const VIEWS: { id: CamView; label: string }[] = [
  { id: "iso", label: "Isometrik" },
  { id: "top", label: "Atas" },
  { id: "side", label: "Sisi" },
  { id: "focus", label: "Fokus" },
];

export default function Board3D(props: Board3DProps) {
  const [canRotate, setCanRotate] = useState(false);
  const [view, setView] = useState<CamView>("iso");
  useEffect(() => setCanRotate(window.matchMedia("(pointer: fine)").matches), []);

  return (
    <div className="board3d">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 12, 9.5], fov: 38 }} gl={{ antialias: true, alpha: true }}>
        <hemisphereLight args={["#f3efff", "#3a2a80", 1.1]} />
        <directionalLight
          position={[7, 16, 9]}
          intensity={1.7}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-bias={-0.0005}
        />
        <pointLight position={[0, 3, -1.3]} intensity={6} color="#ffcc55" distance={7} />
        <AdaptiveQuality />
        <Stars radius={70} depth={35} count={1200} factor={3} fade speed={0.6} />
        <Suspense fallback={null}>
          <BoardModel drawn={props.drawn} />
          <Scene {...props} />
        </Suspense>
        <CameraRig view={view} players={props.players} currentId={props.currentId} canRotate={canRotate} />
      </Canvas>
      <div className="cam-views" role="group" aria-label="Pandangan kamera">
        {VIEWS.map((v) => (
          <button key={v.id} className={`cam-view ${view === v.id ? "on" : ""}`} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {canRotate && <div className="board3d-hint">Seret untuk memutar · tatal untuk zum</div>}
    </div>
  );
}

/**
 * Keeps the game smooth on slower phones: if the frame rate drops, render at a lower
 * resolution and turn shadows off. Fast devices keep full quality.
 */
function AdaptiveQuality() {
  const { gl, scene, setDpr } = useThree();
  const lowered = useRef(false);
  return (
    <PerformanceMonitor
      onDecline={() => {
        if (lowered.current) return;
        lowered.current = true;
        setDpr(1);
        gl.shadowMap.enabled = false;
        scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
          (Array.isArray(m) ? m : m ? [m] : []).forEach((mat) => (mat.needsUpdate = true));
        });
      }}
    />
  );
}

// ---------------------------------------------------------------- camera

/** Moves the camera smoothly to the chosen view. "Fokus" follows the current player. */
function CameraRig({
  view,
  players,
  currentId,
  canRotate,
}: {
  view: CamView;
  players: Player[];
  currentId: string | null;
  canRotate: boolean;
}) {
  const { camera, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const moving = useRef(true);
  const goal = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });

  // Fit the board to the screen shape: narrow screens pull the camera back.
  const fit = Math.max(1, 1.6 / (size.width / size.height));
  const current = players.find((p) => p.id === currentId);
  const focusSquare = current?.position ?? 0;

  useEffect(() => {
    moving.current = true;
  }, [view, fit, focusSquare]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const g = goal.current;
    if (view === "iso") {
      g.target.set(0, 0, 0.3);
      g.pos.set(0, 12.9, 10.2).multiplyScalar(fit);
    } else if (view === "top") {
      g.target.set(0, 0, 0);
      g.pos.set(0, 19.5, 0.01).multiplyScalar(fit);
    } else if (view === "side") {
      g.target.set(0, 0, 0);
      g.pos.set(-15, 6.5, 8).multiplyScalar(fit);
    } else {
      const [x, , z] = squareToWorld(focusSquare);
      g.target.set(x * 0.85, 0, z * 0.85);
      g.pos.set(x * 0.85, 7, z * 0.85 + 6.5);
    }
    if (!moving.current) return;
    const k = 1 - Math.pow(0.002, dt); // frame-rate independent ease
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.02 && c.target.distanceTo(g.target) < 0.02) moving.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableRotate={canRotate}
      minDistance={5}
      maxDistance={40}
      maxPolarAngle={1.35}
      onStart={() => {
        moving.current = false; // the player took over the camera
      }}
    />
  );
}

// ---------------------------------------------------------------- tokens

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
      placed.push({ player: p, at: squareToWorld(pos, dx * 0.9, dy * 0.9) });
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
    if (m) m.opacity = 0.45 + Math.sin(clock.elapsedTime * 4) * 0.2;
  });
  return (
    <mesh ref={ref} position={[x, TILE_TOP + 0.006, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <ringGeometry args={[TW * 0.6, TW * 0.68, 4, 1]} />
      <meshBasicMaterial color="#ffcf3f" transparent opacity={0.6} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

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
    now.y = target[1];
    anim.current = { from: now, to: new THREE.Vector3(...target), t: 0, key };
  }

  useFrame(({ clock }, dt) => {
    const a = anim.current;
    if (!group.current) return;
    if (a.t < 1) a.t = Math.min(1, a.t + dt / ((STEP_MS / 1000) * 0.9));
    const ease = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
    group.current.position.lerpVectors(a.from, a.to, ease);
    group.current.position.y = a.to.y + Math.sin(a.t * Math.PI) * 0.7; // hop
    if (figure.current) {
      figure.current.position.y = active && a.t >= 1 ? 0.08 + Math.sin(clock.elapsedTime * 4) * 0.08 : 0;
    }
  });

  const color = player.connected ? (c?.color ?? "#ffffff") : "#777777";
  return (
    <group ref={group} position={target}>
      <mesh castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.12, 32]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
      </mesh>
      {active && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.5, 40]} />
          <meshBasicMaterial color="#ffcf3f" transparent opacity={0.95} toneMapped={false} />
        </mesh>
      )}
      <group ref={figure}>
        {/* Faces the camera fully (like a card held up), so it reads well even from above */}
        <Billboard position={[0, 0.12, 0]}>{c ? <Standee characterId={c.id} dim={!player.connected} /> : null}</Billboard>
      </group>
      <Html position={[0, 2.05, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
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

const STANDEE_H = 1.7;

function Standee({ characterId, dim }: { characterId: CharacterId; dim: boolean }) {
  const tex = useTexture(CHARACTERS[characterId].image);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 0.38;
  return (
    <mesh position={[0, STANDEE_H / 2, 0]}>
      <planeGeometry args={[STANDEE_H * aspect, STANDEE_H]} />
      {/* unlit, so the character art keeps its real colours from any camera angle */}
      <meshBasicMaterial map={tex} transparent alphaTest={0.15} side={THREE.DoubleSide} color={dim ? "#777777" : "#ffffff"} toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- dice

const DIE = 0.75;
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

const DICE_AT: [number, number] = [0, 1.55];
const REST_Y = DIE / 2 + 0.01;
const SPIN_S = 0.9;
const SETTLE_S = 0.45;

function Dice({ value, rollKey }: { value: number | null; rollKey?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const materials = useMemo(
    () => FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({ map: faceTexture(v), roughness: 0.3 })),
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
    if (ref.current && value && anim.current.t >= SPIN_S + SETTLE_S) ref.current.quaternion.setFromEuler(FACE_UP[value]);
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
      m.quaternion.slerpQuaternions(a.start, a.target, 1 - Math.pow(1 - k, 3));
      m.position.y = REST_Y + Math.abs(Math.sin(k * Math.PI * 2)) * 0.25 * (1 - k); // little bounce
    }
  });

  if (!value) return null;
  return (
    <mesh ref={ref} position={[DICE_AT[0], REST_Y, DICE_AT[1]]} material={materials} castShadow>
      <boxGeometry args={[DIE, DIE, DIE]} />
    </mesh>
  );
}
