"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

// Threads drift like silk across the hero; near the cursor they bend toward it,
// the way attention weights gather on a query.

const THREAD_COUNT = 22;
const SEGMENTS = 96;
const POLLEN_COUNT = 40;

type Pointer = { x: number; y: number; active: boolean };

type Thread = {
  base: number;
  amp: number;
  freq: number;
  speed: number;
  phase: number;
  swatch: number;
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

// Kept quiet so the hero reads as a backdrop, not a feature. Same swatch slots in both themes.
const SWATCHES = [
  { weight: 0.45, light: "#aa7f66", dark: "#aa7f66" }, // milk tea
  { weight: 0.3, light: "#7f5836", dark: "#f2cfca" }, // aloewood / misty rose
  { weight: 0.25, light: "#e0797b", dark: "#ec9c9d" }, // sakura
];

function pickSwatch(r: number) {
  let acc = 0;
  for (let i = 0; i < SWATCHES.length; i++) {
    acc += SWATCHES[i].weight;
    if (r < acc) return i;
  }
  return 0;
}

// Tracks the effective theme: an explicit data-theme choice, else the system setting.
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => setDark(root.dataset.theme ? root.dataset.theme === "dark" : mq.matches);
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    mq.addEventListener("change", read);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", read);
    };
  }, []);
  return dark;
}

function Threads({ pointer, animate, dark }: { pointer: RefObject<Pointer>; animate: boolean; dark: boolean }) {
  const viewport = useThree((s) => s.viewport);
  const invalidate = useThree((s) => s.invalidate);
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
      swatch: pickSwatch(rand()),
      opacity: 0.1 + rand() * 0.22,
    }));
  }, []);

  const lines = useMemo(
    () =>
      threads.map((t) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEGMENTS * 3), 3));
        const material = new THREE.LineBasicMaterial({ transparent: true, opacity: t.opacity });
        return new THREE.Line(geometry, material);
      }),
    [threads],
  );

  useEffect(() => {
    lines.forEach((line, i) => {
      const t = threads[i];
      const material = line.material as THREE.LineBasicMaterial;
      material.color.set(dark ? SWATCHES[t.swatch].dark : SWATCHES[t.swatch].light);
      material.opacity = dark ? t.opacity * 1.4 : t.opacity;
    });
    invalidate();
  }, [dark, lines, threads, invalidate]);

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

function Pollen({ animate, dark }: { animate: boolean; dark: boolean }) {
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
        color={dark ? "#ec9c9d" : "#aa7f66"}
        size={0.06}
        transparent
        opacity={dark ? 0.55 : 0.4}
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
  const dark = useIsDark();

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
        <Threads pointer={pointer} animate={animate} dark={dark} />
        <Pollen animate={animate} dark={dark} />
      </Canvas>
    </div>
  );
}
