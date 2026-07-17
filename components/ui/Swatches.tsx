"use client";

import { useSyncExternalStore } from "react";

/**
 * Swatches — renders the 8 core/derived color tokens as filled chips.
 * Hex labels are read from the :root CSS variables at runtime (via
 * useSyncExternalStore, the React-endorsed way to read browser values
 * without an effect) so that no hex literal ever lives in component
 * source (DESIGN §8 hard rule + the setup-prompt grep acceptance).
 */
const TOKENS: { varName: string; bg: string }[] = [
  { varName: "--lime", bg: "bg-lime" },
  { varName: "--ink", bg: "bg-ink" },
  { varName: "--slate", bg: "bg-slate" },
  { varName: "--white", bg: "bg-white" },
  { varName: "--bg-light", bg: "bg-bg-light" },
  { varName: "--card-peek", bg: "bg-card-peek" },
  { varName: "--risk-low", bg: "bg-risk-low" },
  { varName: "--risk-high", bg: "bg-risk-high" },
];

const EMPTY: Record<string, string> = {};
let cache: Record<string, string> | null = null;

function readVars(): Record<string, string> {
  if (cache) return cache;
  const root = getComputedStyle(document.documentElement);
  const next: Record<string, string> = {};
  for (const t of TOKENS) {
    next[t.varName] = root.getPropertyValue(t.varName).trim() || "—";
  }
  cache = next;
  return next;
}

const subscribe = () => () => {};
const getSnapshot = () => readVars();
const getServerSnapshot = () => EMPTY;

export function Swatches() {
  const labels = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="grid grid-cols-2 gap-3">
      {TOKENS.map((t) => (
        <div
          key={t.varName}
          className="flex items-center gap-3 rounded-chip bg-white p-3 shadow-card"
        >
          <div
            className={`h-10 w-10 shrink-0 rounded-chip ring-1 ring-black/5 ${t.bg}`}
          />
          <div className="min-w-0">
            <div className="text-caption text-ink">{t.varName}</div>
            <div
              className="text-unit break-all"
              style={{ color: "var(--ink-60)" }}
            >
              {labels[t.varName] ?? "…"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
