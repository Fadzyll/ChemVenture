"use client";

import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { SquareType } from "@/shared/board.ts";
import { clapperTexture, drumTexture, radiationTexture } from "./textures";

/** One 3D object per square type, built from simple shapes. Sized for a ~1.7-unit tile. */
export function TileIcon({ type }: { type: SquareType }) {
  switch (type) {
    case "ion":
      return <Bolts />;
    case "kovalen":
      return <Molecule />;
    case "asas":
      return <Magnifier />;
    case "drum":
      return <Drum />;
    case "radikal":
      return <MushroomCloud />;
    case "gangguan":
      return <ToxicCloud />;
    case "neutral":
      return <Burst />;
    case "reaksi":
      return <Reaksi />;
  }
}

/** Small dark ring the floating icons hover over. */
function Pedestal({ r = 0.2 }: { r?: number }) {
  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.55, r, 32]} />
      <meshStandardMaterial color="#3b3560" roughness={0.5} />
    </mesh>
  );
}

// ---------------------------------------------------------------- ION: lightning bolts

function boltGeometry() {
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [0.06, 0.5], [-0.16, 0.0], [0.0, 0.0], [-0.1, -0.5], [0.2, 0.1], [0.04, 0.1], [0.18, 0.5],
  ];
  s.moveTo(...pts[0]);
  for (const p of pts.slice(1)) s.lineTo(...p);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  g.center();
  return g;
}

function Bolts() {
  const geo = useMemo(boltGeometry, []);
  return (
    <group>
      <Pedestal />
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4} floatingRange={[0, 0.08]}>
        <mesh geometry={geo} position={[-0.08, 0.38, 0]} rotation={[0, 0.3, -0.15]} scale={0.75}>
          <meshStandardMaterial color="#ffd21f" emissive="#ffb000" emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
        <mesh geometry={geo} position={[0.14, 0.3, 0.05]} rotation={[0, -0.3, 0.2]} scale={0.5}>
          <meshStandardMaterial color="#ffe45c" emissive="#ffb000" emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
      </Float>
    </group>
  );
}

// ---------------------------------------------------------------- KOVALEN: molecule

function Molecule() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.6;
  });
  const atoms: { p: [number, number, number]; r: number; c: string }[] = [
    { p: [0, 0, 0], r: 0.13, c: "#3b82f6" },
    { p: [0.24, 0.12, 0], r: 0.09, c: "#ef4444" },
    { p: [-0.22, 0.1, 0.1], r: 0.09, c: "#22c55e" },
    { p: [0.02, -0.2, 0.12], r: 0.08, c: "#f59e0b" },
    { p: [-0.04, 0.16, -0.22], r: 0.08, c: "#f472b6" },
    { p: [0.36, 0.3, -0.05], r: 0.06, c: "#e5e7eb" },
  ];
  const bonds: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5]];
  return (
    <group>
      <Pedestal />
      <group ref={ref} position={[0, 0.42, 0]}>
        {atoms.map((a, i) => (
          <mesh key={i} position={a.p}>
            <sphereGeometry args={[a.r, 24, 16]} />
            <meshStandardMaterial color={a.c} roughness={0.25} metalness={0.1} />
          </mesh>
        ))}
        {bonds.map(([i, j], k) => (
          <Bond key={k} a={atoms[i].p} b={atoms[j].p} />
        ))}
      </group>
    </group>
  );
}

function Bond({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      pos: va.clone().add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[0.025, 0.025, len, 10]} />
      <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
    </mesh>
  );
}

// ---------------------------------------------------------------- ASAS: magnifying glass

function Magnifier() {
  return (
    <group>
      <Pedestal />
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.3} floatingRange={[0, 0.06]}>
        <group position={[0, 0.48, 0]} rotation={[0.2, 0.4, -0.5]}>
          <mesh>
            <torusGeometry args={[0.2, 0.045, 16, 40]} />
            <meshStandardMaterial color="#d7dbe6" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.19, 32]} />
            <meshStandardMaterial color="#bfe6ff" transparent opacity={0.45} side={THREE.DoubleSide} roughness={0.05} />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.32, 16]} />
            <meshStandardMaterial color="#2b2b3a" roughness={0.5} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

// ---------------------------------------------------------------- DRUM

function Drum() {
  const side = useMemo(() => drumTexture(), []);
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.36, 40, 1, true]} />
        <meshStandardMaterial map={side} side={THREE.DoubleSide} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.385, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 40]} />
        <meshStandardMaterial color="#fbf7ee" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0.46, 0.02]} rotation={[0.3, 0, s * 1.05]}>
          <cylinderGeometry args={[0.018, 0.022, 0.62, 8]} />
          <meshStandardMaterial color="#c08a4a" roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * 0.33, 0.6, 0.12]}>
          <sphereGeometry args={[0.04, 12, 10]} />
          <meshStandardMaterial color="#e8402a" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- RADIKAL: mushroom cloud

function MushroomCloud() {
  const cap: [number, number, number, number][] = [
    [0, 0.62, 0, 0.2], [0.17, 0.58, 0.05, 0.15], [-0.17, 0.58, 0.02, 0.15], [0.05, 0.7, -0.12, 0.14], [-0.06, 0.55, 0.15, 0.13],
  ];
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.52, 40]} />
        <meshStandardMaterial color="#7cc8ff" transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffb347" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 0.42, 16]} />
        <meshStandardMaterial color="#ffa53a" roughness={0.6} />
      </mesh>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.25} floatingRange={[0, 0.05]}>
        {cap.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 20, 14]} />
            <meshStandardMaterial color={i % 2 ? "#ffcf5c" : "#ff9f2e"} emissive="#ff7a00" emissiveIntensity={0.25} roughness={0.7} />
          </mesh>
        ))}
      </Float>
    </group>
  );
}

// ---------------------------------------------------------------- GANGGUAN: toxic cloud + radiation sign

function ToxicCloud() {
  const sign = useMemo(() => radiationTexture(), []);
  const puffs: [number, number, number, number][] = [
    [0, 0.32, 0, 0.24], [0.22, 0.26, 0.05, 0.18], [-0.22, 0.27, 0.02, 0.19], [0.1, 0.46, -0.08, 0.17], [-0.1, 0.44, 0.1, 0.16],
  ];
  return (
    <group>
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.3} floatingRange={[0, 0.06]}>
        {puffs.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 20, 14]} />
            <meshStandardMaterial color={i % 2 ? "#a3e635" : "#84cc16"} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.36, 0.27]}>
          <circleGeometry args={[0.15, 32]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
}

// ---------------------------------------------------------------- NEUTRAL: starburst

function Burst() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  const spikes = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const p = ico.attributes.position;
    const seen = new Set<string>();
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const k = v.toArray().map((n) => n.toFixed(2)).join();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ pos: v.clone().multiplyScalar(0.17), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v) });
    }
    return out;
  }, []);
  return (
    <group>
      <Pedestal />
      <group ref={ref} position={[0, 0.42, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial color="#ffd84d" emissive="#ffb000" emissiveIntensity={0.3} roughness={0.35} />
        </mesh>
        {spikes.map((s, i) => (
          <mesh key={i} position={s.pos} quaternion={s.quat}>
            <coneGeometry args={[0.05, 0.16, 10]} />
            <meshStandardMaterial color="#1f1f2e" roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- REAKSI: clapperboard + arrow

function arrowGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0.05);
  s.lineTo(0.15, 0.05);
  s.lineTo(0.15, 0.13);
  s.lineTo(0.32, 0);
  s.lineTo(0.15, -0.13);
  s.lineTo(0.15, -0.05);
  s.lineTo(-0.3, -0.05);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
}

function Reaksi() {
  const stripes = useMemo(() => clapperTexture(), []);
  const arrow = useMemo(arrowGeometry, []);
  return (
    <group>
      {/* clapperboard */}
      <group position={[0.05, 0.22, -0.12]} rotation={[0, -0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.36, 0.05]} />
          <meshStandardMaterial color="#222232" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.23, 0]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.52, 0.08, 0.05]} />
          <meshStandardMaterial map={stripes} roughness={0.5} />
        </mesh>
      </group>
      {/* "start here" arrow pointing along the path (towards -x, the bottom row) */}
      <mesh geometry={arrow} position={[0.05, 0.06, 0.3]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <meshStandardMaterial color="#e8402a" emissive="#ff2a00" emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
    </group>
  );
}
