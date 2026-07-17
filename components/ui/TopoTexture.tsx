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

export interface TopoFocus {
  x: number;
  y: number;
}

export interface BuildTopoRingsOptions {
  focus: TopoFocus;
  rings?: number;
  seed?: number;
  samples?: number;
  /** Base radius as a function of ring index i (1-based). */
  base?: (i: number) => number;
}

/**
 * Build deterministic contour-line ring paths radiating from `focus`. Pure,
 * no DOM. Reused by TopoTexture (default off-canvas focus) and by the hero
 * blob SVG (focus = the blob's off-screen center, so contours radiate from
 * the blob's origin — DESIGN §5.1 item 2 / §3.5).
 */
export function buildTopoRings({
  focus,
  rings = 22,
  seed = 1,
  samples = SAMPLES,
  base = (i) => 30 + i * 26,
}: BuildTopoRingsOptions): string[] {
  const out: string[] = [];
  for (let i = 1; i <= rings; i++) {
    out.push(ringPath(focus.x, focus.y, base(i), i, seed, samples));
  }
  return out;
}

function ringPath(
  fx: number,
  fy: number,
  base: number,
  i: number,
  seed: number,
  samples = SAMPLES,
): string {
  let d = "";
  for (let k = 0; k < samples; k++) {
    const theta = (k / samples) * Math.PI * 2;
    const r = base * (1 + 0.05 * Math.sin(2 * theta + seed + 0.35 * i));
    const x = fx + r * Math.cos(theta);
    const y = fy + r * Math.sin(theta);
    d += (k === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d + "Z";
}

export function TopoTexture({ tone, rings = 22, seed = 1, className = "", svgHref }: TopoTextureProps) {
  const paths = useMemo(
    () => buildTopoRings({ focus: { x: SYSTEM_A.x, y: SYSTEM_A.y }, rings, seed, base: SYSTEM_A.base }),
    [rings, seed],
  );

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
