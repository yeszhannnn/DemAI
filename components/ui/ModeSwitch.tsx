"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ModeSwitch — DESIGN §4 (Airly reference). A lime capsule (h 48, r-full,
 * --lime, inner padding 4) centered horizontally just below the map top bar.
 * Two segments — «2D» / «3D» — chip/600. The ACTIVE segment is an INK pill
 * (bg --ink, text --lime) that SLIDES between positions as ONE DOM node
 * (it never unmounts/remounts), 220ms cubic-bezier(.32,.72,.29,.99) — the same
 * glide mechanic as the onboarding ProgressDots pill (DESIGN §7). Inactive
 * segments render ink text on lime.
 *
 * The control has NO hover/press states — no lift, no scale, no shadow, no
 * cursor change beyond the default pointer. It reacts ONLY by sliding the ink
 * pill on click. Under prefers-reduced-motion the glide is instant.
 *
 * `value` / `onChange` are controlled. The parent owns the 2D/3D mode logic
 * (pitch + extrusion + localStorage); this component is pure presentation +
 * the sliding pill animation.
 */
export type ModeSwitchValue = "2d" | "3d";

export interface ModeSwitchProps {
  value: ModeSwitchValue;
  onChange: (v: ModeSwitchValue) => void;
  /** aria-label for the whole control. */
  ariaLabel?: string;
}

const SEGMENTS: { key: ModeSwitchValue; label: string }[] = [
  { key: "2d", label: "2D" },
  { key: "3d", label: "3D" },
];

const CAPSULE_HEIGHT = 48;
const CAPSULE_PADDING = 4;
// Each segment is a square chip (h = capsule inner height) with equal width.
const SEGMENT_HEIGHT = CAPSULE_HEIGHT - CAPSULE_PADDING * 2; // 40
const SEGMENT_WIDTH = SEGMENT_HEIGHT; // 40 — square chips
const EASING = "cubic-bezier(.32,.72,.29,.99)";
const DURATION_MS = 220;

export function ModeSwitch({ value, onChange, ariaLabel }: ModeSwitchProps) {
  const reduceMotion = usePrefersReducedMotion();
  const activeIndex = value === "3d" ? 1 : 0;
  // The ink pill translates by activeIndex · SEGMENT_WIDTH. Same DOM node
  // across switches → the browser interpolates the glide.
  const pillTranslateX = activeIndex * SEGMENT_WIDTH;

  const capsuleWidth = SEGMENT_WIDTH * SEGMENTS.length + CAPSULE_PADDING * 2;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="absolute z-20 inline-flex"
      style={{
        left: "50%",
        top: 88,
        transform: "translateX(-50%)",
        height: CAPSULE_HEIGHT,
        width: capsuleWidth,
        padding: CAPSULE_PADDING,
        borderRadius: "var(--r-full)",
        background: "var(--lime)",
        border: "none",
      }}
    >
      {/* Sliding ink pill — one DOM node, glides between slots. */}
      <span
        aria-hidden
        className="pointer-events-none absolute block"
        style={{
          top: CAPSULE_PADDING,
          left: CAPSULE_PADDING,
          height: SEGMENT_HEIGHT,
          width: SEGMENT_WIDTH,
          borderRadius: "var(--r-full)",
          background: "var(--ink)",
          transform: `translateX(${pillTranslateX}px)`,
          transition: reduceMotion
            ? "none"
            : `transform ${DURATION_MS}ms ${EASING}`,
        }}
      />
      {SEGMENTS.map((seg, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={seg.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.key)}
            className="relative inline-flex items-center justify-center"
            style={{
              width: SEGMENT_WIDTH,
              height: SEGMENT_HEIGHT,
              borderRadius: "var(--r-full)",
              border: "none",
              padding: 0,
              background: "transparent",
              color: active ? "var(--lime)" : "var(--ink)",
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 16,
              cursor: "pointer",
              zIndex: 1,
            }}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * usePrefersReducedMotion — DESIGN §7. Under prefers-reduced-motion the ink
 * pill glide becomes instant. Subscribes to the media query so a live OS toggle
 * is picked up without a reload. Mirrors the onboarding hook.
 */
function usePrefersReducedMotion(): boolean {
  const getSnapshot = () =>
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduce, setReduce] = useState<boolean>(() => getSnapshot());
  const mqRef = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mqRef.current = mq;
    const onChange = () => setReduce(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}
