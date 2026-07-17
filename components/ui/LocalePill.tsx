"use client";

import { useEffect, useRef, useState } from "react";
import {
  markLocalePicked,
  setLocale,
  useLocale,
  useT,
  type Locale,
} from "@/lib/i18n";

/**
 * LocalePill — DESIGN §5.5. A small glass capsule (bg --glass-light + blur)
 * sitting top-right of the landing TopBar, with two segments «ҚАЗ» / «РУС».
 * The ACTIVE segment is an INK pill (bg --ink, text --lime) that SLIDES between
 * positions as ONE DOM node — the same glide mechanic as the ModeSwitch 2D/3D
 * capsule and the onboarding ProgressDots (DESIGN §7). Inactive segments render
 * white text on the glass. Switching the pill sets the i18n locale live
 * (re-renders all `useT()` copy) and marks it as picked (→ onboarding skips S0).
 *
 * No hover/press states of its own — it reacts only by sliding the ink pill.
 * Under prefers-reduced-motion the glide is instant.
 */
export interface LocalePillProps {
  /** aria-label for the whole control. */
  ariaLabel?: string;
}

const SEGMENTS: { key: Locale; labelKey: "landing.locale.kk" | "landing.locale.ru" }[] = [
  { key: "kk", labelKey: "landing.locale.kk" },
  { key: "ru", labelKey: "landing.locale.ru" },
];

const CAPSULE_HEIGHT = 36;
const CAPSULE_PADDING = 4;
const SEGMENT_HEIGHT = CAPSULE_HEIGHT - CAPSULE_PADDING * 2; // 28
const SEGMENT_WIDTH = 44;
const EASING = "cubic-bezier(.32,.72,.29,.99)";
const DURATION_MS = 220;

export function LocalePill({ ariaLabel }: LocalePillProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [locale] = useLocale();
  const t = useT();
  const activeIndex = locale === "kk" ? 0 : 1;
  const pillTranslateX = activeIndex * SEGMENT_WIDTH;
  const capsuleWidth = SEGMENT_WIDTH * SEGMENTS.length + CAPSULE_PADDING * 2;

  function handleChange(l: Locale) {
    if (l === locale) return;
    setLocale(l); // persists + notifies → all useT() copy re-renders
    markLocalePicked(); // → onboarding skips S0 (§5.5)
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative inline-flex"
      style={{
        height: CAPSULE_HEIGHT,
        width: capsuleWidth,
        padding: CAPSULE_PADDING,
        borderRadius: "var(--r-full)",
        background: "var(--glass-light)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
          transition: reduceMotion ? "none" : `transform ${DURATION_MS}ms ${EASING}`,
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
            onClick={() => handleChange(seg.key)}
            className="relative inline-flex items-center justify-center"
            style={{
              width: SEGMENT_WIDTH,
              height: SEGMENT_HEIGHT,
              borderRadius: "var(--r-full)",
              border: "none",
              padding: 0,
              background: "transparent",
              color: active ? "var(--lime)" : "var(--white)",
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 16,
              cursor: "pointer",
              zIndex: 1,
            }}
          >
            {t(seg.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * usePrefersReducedMotion — DESIGN §7. Under prefers-reduced-motion the ink
 * pill glide becomes instant. Subscribes to the media query so a live OS
 * toggle is picked up without a reload.
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
