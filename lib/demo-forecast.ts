/**
 * lib/demo-forecast.ts — DEMO-only smooth daily risk curve (DESIGN §7).
 *
 * The committed snapshot stores flat hourly risks (the real composition pipeline
 * holds PM2.5/pollen constant, so the snapshot's hours are nearly uniform). For
 * the demo chart we replace them with a plausible, deterministic daily curve:
 * a gentle wave with a morning bump (~08:00) and a stronger evening bump
 * (~19:00), a small ±0.4 deterministic jitter, clamped to a realistic [1,7]
 * band. Pure function of hour-of-day → identical every reload, no zigzag.
 *
 * The real (non-demo) path is untouched and still uses computed hourly risk.
 */

import type { HourlyPoint } from "./compose";

/** Gaussian bump centered at `center` with peak height `peak`, width `width`. */
function bump(hour: number, center: number, peak: number, width: number): number {
  return peak * Math.exp(-((hour - center) ** 2) / (2 * width * width));
}

/** Deterministic ±0.4 jitter from a hash of the index (no Math.random). */
function jitter(i: number): number {
  const h = Math.sin(i * 127.1) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 0.8;
}

function demoRiskAt(hour: number, i: number): number {
  const morning = bump(hour, 8, 1.0, 2.4);
  const evening = bump(hour, 19, 2.2, 2.6);
  const baseline = 1.8;
  const raw = baseline + morning + evening + jitter(i);
  return Math.max(1, Math.min(7, Math.round(raw)));
}

function parseHour(label: string): number {
  const m = label.match(/(\d{1,2}):\d{2}/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Build a deterministic 14-hour demo curve, preserving the snapshot's
 * hourLabels and only replacing the risks with the smooth wave.
 */
export function demoHourly(
  snapshotHourly: { hourLabel: string; risk: number }[],
): HourlyPoint[] {
  return snapshotHourly.map((h, i) => ({
    hourLabel: h.hourLabel,
    risk: demoRiskAt(parseHour(h.hourLabel), i),
  }));
}
