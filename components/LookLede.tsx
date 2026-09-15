"use client";

import { useEffect, useRef, useState } from "react";

// Hovering the phrase pulls the hero threads toward the portrait (see AttentionThreads).
export const LOOK_EVENT = "isa:look";

type Props = {
  before: string;
  phrase: string;
};

export default function LookLede({ before, phrase }: Props) {
  const [active, setActive] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);

  const set = (value: boolean) => {
    setActive(value);
    window.dispatchEvent(new CustomEvent(LOOK_EVENT, { detail: value }));
  };

  // On touch there's no pointer leave, so tapping anywhere else releases the threads.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (trigger.current && !trigger.current.contains(e.target as Node)) set(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  return (
    <p className="lede">
      {before}
      <span
        ref={trigger}
        className="look-trigger"
        data-active={active}
        onPointerEnter={(e) => e.pointerType === "mouse" && set(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && set(false)}
        onClick={() => set(!active)}
      >
        {phrase}
      </span>
      .
    </p>
  );
}
