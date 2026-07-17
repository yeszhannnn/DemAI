"use client";

import { ReactNode } from "react";
import { TopoTexture } from "./TopoTexture";

/**
 * AccentBlock — DESIGN §4.3. Lime block (--r-inner) with the procedural
 * topographic texture (TopoTexture tone="ink"), the num-card value + unit
 * superscript on the left, and a 2-line ink-40 verdict on the right.
 * Tapping scrolls to "Why".
 */
export interface AccentBlockProps {
  value: ReactNode;
  unit?: ReactNode;
  verdict?: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Height per §4.3 (~96). */
  style?: React.CSSProperties;
}

export function AccentBlock({ value, unit, verdict, onClick, className = "", style }: AccentBlockProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden text-left transition-transform duration-150 active:scale-[.98] ${className}`}
      style={{
        background: "var(--lime)",
        borderRadius: "var(--r-inner)",
        padding: "16px 20px",
        minHeight: 96,
        border: "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {/* Procedural topo texture (DESIGN §3.5) */}
      <TopoTexture tone="ink" />

      {/* Foreground content */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-num-card text-ink leading-none">{value}</span>
          {unit ? (
            <span className="text-unit text-ink align-super" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              {unit}
            </span>
          ) : null}
        </div>
        {verdict ? (
          <p
            className="max-w-[55%] text-right text-body leading-[22px] line-clamp-2"
            style={{ color: "var(--ink-40)" }}
          >
            {verdict}
          </p>
        ) : null}
      </div>
    </button>
  );
}
