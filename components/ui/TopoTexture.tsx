"use client";

import { useMemo } from "react";

/**
 * TopoTexture — DESIGN §3.5. Deterministic procedural contour lines
 * (no randomness, no texture files). Used on lime surfaces (tone="ink")
 * and slate/peek surfaces (tone="light").
 *
 * System A (main sweep): focus OFF-canvas at (-40,-20); rings i=1..22,
 * base radius 30+i*26 (arcs up to ~600 cross the whole 400x240 viewBox);
 * 96 angle samples; r' = base*(1 + 0.05*sin(2θ + seed + 0.35*i)). No
 * high-frequency term — it caused the squiggles. Within the window this
 * reads as long near-parallel sweeping contours, denser toward top-left.
 * No closed loops anywhere in the window.
 *
 * Stroke 1px, opacity .13 (ink) / .10 (light), fill none, round joins,
 * clipped by the parent's border radius. Colors are sourced from CSS
 * variables (var(--ink)/var(--white)) so no hex literal lives in component
 * source (DESIGN §8). If the designer ever exports the original texture,
 * pass `svgHref` to override.
 */
export interface TopoTextureProps {
  tone: "ink" | "light";
  rings?: number;
  seed?: number;
  className?: string;
  svgHref?: string;
}

const SYSTEM_A = { x: -40, y: -20, base: (i: number) => 30 + i * 26 };
const SAMPLES = 96;

function ringPath(fx: number, fy: number, base: number, i: number, seed: number): string {
  let d = "";
  for (let k = 0; k < SAMPLES; k++) {
    const theta = (k / SAMPLES) * Math.PI * 2;
    const r = base * (1 + 0.05 * Math.sin(2 * theta + seed + 0.35 * i));
    const x = fx + r * Math.cos(theta);
    const y = fy + r * Math.sin(theta);
    d += (k === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d + "Z";
}

export function TopoTexture({ tone, rings = 22, seed = 1, className = "", svgHref }: TopoTextureProps) {
  const paths = useMemo(() => {
    const out: string[] = [];
    // System A — long off-canvas sweep.
    for (let i = 1; i <= rings; i++) {
      out.push(ringPath(SYSTEM_A.x, SYSTEM_A.y, SYSTEM_A.base(i), i, seed));
    }
    return out;
  }, [rings, seed]);

  const stroke = tone === "ink" ? "var(--ink)" : "var(--white)";
  const strokeOpacity = tone === "ink" ? 0.13 : 0.1;

  if (svgHref) {
    return (
      <img
        src={svgHref}
        alt=""
        aria-hidden
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <g stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round">
        {paths.map((d, idx) => (
          <path key={idx} d={d} />
        ))}
      </g>
    </svg>
  );
}
