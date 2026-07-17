/**
 * Pollen GDD model — Kazakhstan's first local pollen calendar (PROMPTS §4).
 *
 * Phenology: each species accumulates Growing Degree Days (GDD) from a fixed
 * calendar date; the accumulated sum maps to a flowering phase, which maps to
 * a 0..5 pollen level. Server-side only (uses fetch + fs), no React, no side
 * effects on import.
 *
 *   GDD = Σ max(0, dailyMeanT − baseC)   accumulated from `accumulateFrom`
 *
 * Phase → level (DESIGN/PROMPTS §4 step 4):
 *   below start            → 0
 *   start .. peak          → ramps 1 → 4 linearly
 *   ±10% around peak       → 5
 *   peak .. end            → decays 4 → 1 linearly
 *   past end               → 0
 */

import { promises as fs } from "fs";
import path from "path";
import { isDemo } from "./demo";

export type SpeciesKey = "birch" | "wormwood" | "ragweed";

export interface SpeciesConfig {
  /** MM-DD from which GDD starts accumulating (current year). */
  accumulateFrom: string;
  startGdd: number;
  peakGdd: number;
  endGdd: number;
}

// CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
const DEFAULT_SPECIES: Record<SpeciesKey, SpeciesConfig> = {
  // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
  birch: {
    accumulateFrom: "03-01",
    startGdd: 90, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
    peakGdd: 170, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
    endGdd: 300, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
  },
  // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
  wormwood: {
    accumulateFrom: "04-01",
    startGdd: 480, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
    peakGdd: 700, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
    endGdd: 950, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
  },
  // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
  ragweed: {
    accumulateFrom: "04-01",
    startGdd: 620, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
    peakGdd: 850, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
    endGdd: 1100, // CALIBRATE: placeholder from generic phenology literature — verify with team lead before finals
  },
};

/**
 * The active species table. Overridable as a whole via `data/pollen_overrides.json`
 * (loaded lazily on first access; file absence is the normal case). Kept as a
 * function so the override is only read when actually needed (no import side
 * effects, no fs hit at module load).
 */
let cachedSpecies: Record<SpeciesKey, SpeciesConfig> | null = null;
let overrideAttempted = false;

async function loadSpecies(): Promise<Record<SpeciesKey, SpeciesConfig>> {
  if (cachedSpecies) return cachedSpecies;
  if (overrideAttempted) {
    cachedSpecies = DEFAULT_SPECIES;
    return cachedSpecies;
  }
  overrideAttempted = true;
  try {
    const overridePath = path.join(
      process.cwd(),
      "data",
      "pollen_overrides.json",
    );
    const raw = await fs.readFile(overridePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Record<SpeciesKey, SpeciesConfig>>;
    // Merge per-species so a partial override still falls back to defaults.
    // Ignore any non-species keys (e.g. a `_comment` annotation).
    cachedSpecies = {
      birch: { ...DEFAULT_SPECIES.birch, ...parsed.birch },
      wormwood: { ...DEFAULT_SPECIES.wormwood, ...parsed.wormwood },
      ragweed: { ...DEFAULT_SPECIES.ragweed, ...parsed.ragweed },
    };
    return cachedSpecies;
  } catch {
    cachedSpecies = DEFAULT_SPECIES;
    return cachedSpecies;
  }
}

/** Synchronous accessor for tests / pure phase math (uses defaults only). */
export function defaultSpecies(): Record<SpeciesKey, SpeciesConfig> {
  return DEFAULT_SPECIES;
}

export interface City {
  lat: number;
  lon: number;
}

export interface PollenLevels {
  wormwood: number;
  ragweed: number;
  birch: number;
  gdd: Record<SpeciesKey, number>;
  phaseNote: { ru: string; kk: string };
}

// ---------------------------------------------------------------------------
// 1. Open-Meteo archive — daily mean temperature
// ---------------------------------------------------------------------------

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

/**
 * Fetch daily `temperature_2m_mean` from the Open-Meteo archive API (no key)
 * for [fromISO, today]. Returns an array of mean temperatures, one per day,
 * oldest first. Missing days (API gaps) are filled with the previous value
 * (or 0 at the very start) so GDD accumulation stays continuous.
 */
export async function fetchDailyMeans(
  lat: number,
  lon: number,
  fromISO: string,
): Promise<number[]> {
  const startDate = fromISO.slice(0, 10);
  const endDate = todayISO(new Date());
  const url =
    `${ARCHIVE_URL}?latitude=${lat}&longitude=${lon}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_mean&timezone=auto`;

  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(
      `Open-Meteo archive ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as {
    daily?: { time?: string[]; temperature_2m_mean?: (number | null)[] };
  };
  const means = json.daily?.temperature_2m_mean ?? [];
  const filled: number[] = [];
  let last = 0;
  for (const v of means) {
    const t = typeof v === "number" ? v : last;
    filled.push(t);
    last = t;
  }
  return filled;
}

// ---------------------------------------------------------------------------
// 2. GDD accumulation
// ---------------------------------------------------------------------------

/**
 * Accumulate GDD = Σ max(0, mean − baseC) per day.
 * Pure function — no network, deterministic.
 */
export function gdd(temps: number[], baseC = 5): number {
  let acc = 0;
  for (const t of temps) {
    acc += Math.max(0, t - baseC);
  }
  return acc;
}

// ---------------------------------------------------------------------------
// 3 + 4. Phase → level
// ---------------------------------------------------------------------------

/**
 * Map an accumulated GDD value to a 0..5 pollen level for one species.
 * Pure, synchronous — uses the provided config (defaults are fine for tests).
 *
 *   below start            → 0
 *   start .. peak*0.9      → 1 → 4 linear ramp
 *   peak*0.9 .. peak*1.1   → 5   (±10% around peak)
 *   peak*1.1 .. end        → 4 → 1 linear decay
 *   past end               → 0
 */
export function levelFromGdd(
  gddValue: number,
  cfg: SpeciesConfig,
): number {
  const { startGdd: start, peakGdd: peak, endGdd: end } = cfg;
  if (gddValue < start) return 0;
  if (gddValue > end) return 0;

  const peakLow = peak * 0.9;
  const peakHigh = peak * 1.1;

  if (gddValue < peakLow) {
    // Ramp up 1 → 4 across [start, peakLow).
    const t = (gddValue - start) / (peakLow - start);
    return clampLevel(1 + 3 * t);
  }
  if (gddValue <= peakHigh) {
    return 5;
  }
  // Decay 4 → 1 across (peakHigh, end].
  const t = (gddValue - peakHigh) / (end - peakHigh);
  return clampLevel(4 - 3 * t);
}

function clampLevel(v: number): number {
  return Math.min(5, Math.max(0, Math.round(v)));
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function todayISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build the accumulation start date (YYYY-MM-DD) for a given target date. */
function accumulateStartDate(date: Date, mmdd: string): Date {
  const year = date.getFullYear();
  const [m, d] = mmdd.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, d));
  // If the target date is before this year's accumulation start (e.g. querying
  // January), accumulate from the *previous* year's start so winter queries
  // still have a meaningful (likely 0-ish) sum.
  if (start.getTime() > Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) {
    return new Date(Date.UTC(year - 1, m - 1, d));
  }
  return start;
}

/** Whole-day difference (b - a) in days, UTC. */
function dayDiff(a: Date, b: Date): number {
  const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((B - A) / 86_400_000);
}

// ---------------------------------------------------------------------------
// 5. getPollenLevels — with 24h in-memory cache + demo path
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: PollenLevels;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
let cacheHitLogged = false;

function cacheKey(city: City, date: Date): string {
  return `${city.lat.toFixed(4)},${city.lon.toFixed(4)}|${todayISO(date)}`;
}

/**
 * Compute today's (or `date`'s) pollen levels for a city.
 * - In demo mode (`isDemo()`), reads `data/demo_pollen.json` instead of the network.
 * - Otherwise fetches daily mean temperatures from the Open-Meteo archive,
 *   accumulates per-species GDD from each species' `accumulateFrom`, maps to
 *   levels, and returns the full explainable bundle.
 * - Results are cached 24h in-memory keyed by city+date; a cache hit logs once.
 */
export async function getPollenLevels(
  city: City,
  date: Date = new Date(),
): Promise<PollenLevels> {
  const key = cacheKey(city, date);
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    if (!cacheHitLogged) {
      console.log("[pollen] cache hit");
      cacheHitLogged = true;
    }
    return hit.value;
  }

  const value = isDemo()
    ? await readDemoSnapshot()
    : await computeLive(city, date);

  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

async function computeLive(city: City, date: Date): Promise<PollenLevels> {
  const species = await loadSpecies();
  const gddPerSpecies: Record<SpeciesKey, number> = {
    birch: 0,
    wormwood: 0,
    ragweed: 0,
  };

  // Fetch once per unique accumulateFrom date (birch and wormwood/ragweed share
  // '04-01' in defaults — one network call covers both).
  const fetchByFrom: Record<string, number[]> = {};
  for (const key of Object.keys(species) as SpeciesKey[]) {
    const from = accumulateStartDate(date, species[key].accumulateFrom)
      .toISOString()
      .slice(0, 10);
    if (!fetchByFrom[from]) {
      fetchByFrom[from] = await fetchDailyMeans(city.lat, city.lon, from);
    }
  }

  const levels: Record<SpeciesKey, number> = {
    birch: 0,
    wormwood: 0,
    ragweed: 0,
  };

  for (const key of Object.keys(species) as SpeciesKey[]) {
    const cfg = species[key];
    const fromDate = accumulateStartDate(date, cfg.accumulateFrom);
    const fromISO = fromDate.toISOString().slice(0, 10);
    const temps = fetchByFrom[fromISO] ?? [];
    // Trim to [fromDate, date] inclusive — fetchDailyMeans already starts at
    // fromDate, so just cap the tail at `date`.
    const totalDays = dayDiff(fromDate, date) + 1;
    const slice = temps.slice(0, Math.max(0, totalDays));
    const acc = gdd(slice, 5);
    gddPerSpecies[key] = acc;
    levels[key] = levelFromGdd(acc, cfg);
  }

  return {
    wormwood: levels.wormwood,
    ragweed: levels.ragweed,
    birch: levels.birch,
    gdd: gddPerSpecies,
    phaseNote: phaseNote(levels),
  };
}

async function readDemoSnapshot(): Promise<PollenLevels> {
  const file = path.join(process.cwd(), "data", "demo_pollen.json");
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as PollenLevels;
}

/** Short human note about the dominant phase (RU/KK). */
function phaseNote(levels: Record<SpeciesKey, number>): { ru: string; kk: string } {
  const max = Math.max(levels.wormwood, levels.ragweed, levels.birch);
  if (max === 0) {
    return {
      ru: "Пыльцевой сезон не начался",
      kk: "Тозаңды маусым басталмады",
    };
  }
  if (max >= 5) {
    return {
      ru: "Пик пыления одного из аллергенов",
      kk: "Бір аллергеннің шыңы",
    };
  }
  if (max >= 3) {
    return {
      ru: "Активное пыление",
      kk: "Белсенді тозаңдану",
    };
  }
  return {
    ru: "Начало пыления",
    kk: "Тозаңданудың басы",
  };
}

// Exposed for the print script + tests.
export { loadSpecies };
