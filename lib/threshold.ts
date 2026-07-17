/**
 * lib/threshold.ts — the self-learning loop closure (PROMPTS §11).
 *
 * The evening bot question writes one diary row per day with `feeling`
 * (1=Хорошо / 2=Так себе / 3=Плохо) and a snapshot of the ambient PM2.5 at
 * press time. After enough days, the rows where the user felt BAD («Плохо»)
 * reveal the PM2.5 concentration that user is personally sensitive to —
 * that becomes `Profile.personalPm25`, which feeds back into `fPm`
 * (lib/risk.ts) and shifts the whole risk curve for that user.
 *
 * Pure TypeScript, deterministic, zero network — unit-tested in isolation.
 */

/** Minimal diary row shape this module needs (feeling + ambient pm25). */
export interface DiaryInputRow {
  feeling: number;
  pm25: number;
}

const MIN_TOTAL_ROWS = 7;
const MIN_BAD_ROWS = 3;
const CLAMP_LO = 20;
const CLAMP_HI = 80;

/**
 * Median of a sorted-ascending list of numbers. For an even count, the average
 * of the two middle values (the standard median). For an empty list, NaN —
 * but callers always guard with `>= MIN_BAD_ROWS` first.
 */
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * `computePersonalPm25(rows)` — PROMPTS §11.1.
 *
 *   - needs ≥ MIN_TOTAL_ROWS (7) diary rows total, AND
 *   - ≥ MIN_BAD_ROWS (3) rows where feeling === 3 («Плохо»),
 *   - threshold = median of those bad rows' pm25, clamped to [20, 80],
 *   - otherwise null (not enough data yet — the loop is still open).
 *
 * The clamp keeps the calibrated threshold inside a sane physiological band:
 * below 20 µg/m³ the user would be more sensitive than the cleanest band of
 * the breakpoint table; above 80 they'd be less sensitive than the 35–55 band
 * — both extremes are almost certainly noise from a tiny sample.
 */
export function computePersonalPm25(rows: DiaryInputRow[]): number | null {
  if (!Array.isArray(rows) || rows.length < MIN_TOTAL_ROWS) return null;
  const bad = rows.filter((r) => r && r.feeling === 3);
  if (bad.length < MIN_BAD_ROWS) return null;
  const sorted = bad.map((r) => r.pm25).sort((a, b) => a - b);
  const med = median(sorted);
  if (!Number.isFinite(med)) return null;
  return Math.min(CLAMP_HI, Math.max(CLAMP_LO, med));
}
