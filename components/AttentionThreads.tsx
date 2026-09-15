"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

// Threads drift like silk across the hero; near the cursor they bend toward it,
// the way attention weights gather on a query.

const THREAD_COUNT = 30;
const SEGMENTS = 96;
const POLLEN_COUNT = 90;

type Pointer = { x: number; y: number; active: boolean };

type Thread = {
  base: number;
  amp: number;
  freq: number;
  speed: number;
  phase: number;
  color: string;
  opacity: number;
};

// Deterministic so the composition looks the same on every visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = [
  { color: "#c9973a", weight: 0.5 }, // gold, same family as the stole
  { color: "#8a5a44", weight: 0.3 }, // milk chocolate
  { color: "#e2aeb0", weight: 0.2 }, // blush
];

function pickColor(r: number) {
  let acc = 0;
  for (const p of PALETTE) {
    acc += p.weight;
    if (r < acc) return p.color;
  }
  return PALETTE[0].color;
}

function Threads({ pointer, animate }: { pointer: RefObject<Pointer>; animate: boolean }) {
  const viewport = useThree((s) => s.viewport);
  const focus = useRef(new THREE.Vector2(0, 0));
  const pull = useRef(0);

  const threads = useMemo<Thread[]>(() => {
    const rand = mulberry32(7);
    return Array.from({ length: THREAD_COUNT }, (_, i) => ({
      base: -0.85 + (1.7 * i) / (THREAD_COUNT - 1) + (rand() - 0.5) * 0.08,
      amp: 0.18 + rand() * 0.45,
      freq: 0.25 + rand() * 0.5,
      speed: 0.12 + rand() * 0.22,
      phase: rand() * Math.PI * 2,
      color: pickColor(rand()),
      opacity: 0.16 + rand() * 0.32,
    }));
  }, []);

  const lines = useMemo(
    () =>
      threads.map((t) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEGMENTS * 3), 3));
        const material = new THREE.LineBasicMaterial({ color: t.color, transparent: true, opacity: t.opacity });
        return new THREE.Line(geometry, material);
      }),
    [threads],
  );

  useEffect(
    () => () => {
      lines.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
    },
    [lines],
  );

  useFrame((state, delta) => {
    const time = animate ? state.clock.elapsedTime : 0;
    const dt = Math.min(delta, 0.05);
    const w = viewport.width * 1.2;
    const h = viewport.height;

    const p = pointer.current;
    const k = Math.min(1, dt * 3);
    focus.current.x += ((p.x * viewport.width) / 2 - focus.current.x) * k;
    focus.current.y += ((p.y * viewport.height) / 2 - focus.current.y) * k;
    pull.current += ((p.active ? 1 : 0) - pull.current) * Math.min(1, dt * 1.5);

    const fx = focus.current.x;
    const fy = focus.current.y;

    for (let i = 0; i < lines.length; i++) {
      const t = threads[i];
      const attr = lines[i].geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let j = 0; j < SEGMENTS; j++) {
        const x = -w / 2 + (j / (SEGMENTS - 1)) * w;
        let y =
          (t.base * h) / 2 +
          t.amp * Math.sin(x * t.freq + time * t.speed + t.phase) +
          t.amp * 0.35 * Math.sin(x * t.freq * 2.3 - time * t.speed * 0.7 + t.phase * 1.7);
        const dx = x - fx;
        const dy = y - fy;
        const g = Math.exp(-(dx * dx) / 2.4 - (dy * dy) / 5);
        y += (fy - y) * g * 0.5 * pull.current;
        arr[j * 3] = x;
        arr[j * 3 + 1] = y;
        arr[j * 3 + 2] = 0;
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

function Pollen({ animate }: { animate: boolean }) {
  const viewport = useThree((s) => s.viewport);
  const ref = useRef<THREE.Points>(null);

  const { positions, drift, texture } = useMemo(() => {
    const rand = mulberry32(21);
    const positions = new Float32Array(POLLEN_COUNT * 3);
    const drift = new Float32Array(POLLEN_COUNT);
    for (let i = 0; i < POLLEN_COUNT; i++) {
      positions[i * 3] = (rand() - 0.5) * 16;
      positions[i * 3 + 1] = (rand() - 0.5) * 9;
      positions[i * 3 + 2] = (rand() - 0.5) * 2;
      drift[i] = 0.05 + rand() * 0.12;
    }
    // Soft round sprite so the specks read as pollen, not pixels.
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return { positions, drift, texture: new THREE.CanvasTexture(c) };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state, delta) => {
    if (!animate || !ref.current) return;
    const dt = Math.min(delta, 0.05);
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const top = viewport.height / 2 + 0.5;
    for (let i = 0; i < POLLEN_COUNT; i++) {
      arr[i * 3 + 1] += drift[i] * dt;
      arr[i * 3] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.002;
      if (arr[i * 3 + 1] > top) arr[i * 3 + 1] = -top;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        color="#c9973a"
        size={0.09}
        transparent
        opacity={0.55}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default function AttentionThreads() {
  const container = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({ x: 0, y: 0, active: false });
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!mq.matches);
    sync();
    mq.addEventListener("change", sync);

    const onMove = (e: PointerEvent) => {
      const el = container.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      pointer.current = {
        x: ((e.clientX - r.left) / r.width) * 2 - 1,
        y: -(((e.clientY - r.top) / r.height) * 2 - 1),
        active: inside && e.pointerType === "mouse",
      };
    };
    const onLeave = () => {
      pointer.current = { ...pointer.current, active: false };
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={container} className="threads" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 40 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        frameloop={animate ? "always" : "demand"}
      >
        <Threads pointer={pointer} animate={animate} />
        <Pollen animate={animate} />
      </Canvas>
    </div>
  );
}
