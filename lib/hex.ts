/**
 * lib/hex.ts — H3 hex-grid builder for the Map screen (PROMPTS §9.2 / DESIGN §1.4).
 *
 * For each district polygon in the Almaty districts FeatureCollection, compute
 * the H3 cells covering it at resolution 7 (`polygonToCells`), then emit a
 * GeoJSON FeatureCollection of hex polygons (`cellToBoundary`) tagged with the
 * district's slug, name and live risk. Pure + synchronous — no network, no DOM.
 *
 * h3-js v4 API (GeoJSON [lng,lat] order enabled):
 *   polygonToCells(ring, res, true)   → H3Index[]
 *   cellToBoundary(h3,   true)        → [lng, lat][]
 */

import { polygonToCells, cellToBoundary, cellToLatLng } from "h3-js";

export interface HexFeatureProps {
  slug: string;
  nameRu: string;
  nameKk: string;
  risk: number;
  /** Per-feature literal fill hex (set client-side by MapClient's sanitize step). */
  color?: string;
  /** Always-finite risk number (set client-side; never null). */
  riskNum?: number;
  /** Per-dot solid radius in px (set by buildCellPointsGeoJSON's size-variation
   *  step; read by MapClient's circle-radius paint expression). */
  radius?: number;
}

export interface HexFeature {
  type: "Feature";
  properties: HexFeatureProps;
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export interface HexCollection {
  type: "FeatureCollection";
  features: HexFeature[];
}

type DistrictFC = {
  type?: string;
  features: Array<{
    type?: string;
    properties: { slug: string; nameRu: string; nameKk: string };
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }>;
};

export type { DistrictFC };

/** All outer rings of a GeoJSON Polygon/MultiPolygon, as h3 GeoJSON rings. */
function outerRings(geometry: {
  type: string;
  coordinates: number[][][] | number[][][][];
}): number[][][] {
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).map((poly) => poly[0]);
  }
  return [(geometry.coordinates as number[][][])[0]];
}

/**
 * Build the hex grid. `riskBySlug` maps district slug → live risk (1..10).
 * Cells are de-duplicated by H3 index (first district wins) so overlapping
 * polygons never produce stacked hexes. MultiPolygon districts (e.g. Медеу)
 * are fully covered by iterating every polygon.
 */
export function buildHexGeoJSON(
  districts: DistrictFC,
  riskBySlug: Record<string, number>,
  res = 7,
): HexCollection {
  const seen = new Set<string>();
  const features: HexFeature[] = [];

  for (const f of districts.features) {
    const slug = f.properties.slug;
    // Guard null/undefined/non-finite risk — MapLibre paint props must never
    // see null. Default to 0 (→ neutral grey fill in MapClient). `Number(v)`
    // turns "7" strings into 7; `?? 0` covers null/undefined.
    const rawRisk = riskBySlug[slug];
    const risk = Number.isFinite(Number(rawRisk)) ? Number(rawRisk) : 0;
    const rings = outerRings(f.geometry);

    for (const ring of rings) {
      if (!ring || ring.length < 3) continue;
      let cells: string[] = [];
      try {
        cells = polygonToCells(ring, res, true);
      } catch {
        continue;
      }

      for (const cell of cells) {
        if (seen.has(cell)) continue;
        seen.add(cell);
        let boundary: number[][];
        try {
          boundary = cellToBoundary(cell, true);
        } catch {
          continue;
        }
        // Close the ring for GeoJSON validity.
        const closed = [...boundary, boundary[0]];
        features.push({
          type: "Feature",
          properties: {
            slug,
            nameRu: f.properties.nameRu,
            nameKk: f.properties.nameKk,
            risk,
          },
          geometry: { type: "Polygon", coordinates: [closed] },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

/** LngLat bounds [west, south, east, north] for fitBounds. */
export function hexBounds(fc: HexCollection): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const f of fc.features) {
    for (const [lng, lat] of f.geometry.coordinates[0]) {
      if (lng < w) w = lng;
      if (lat < s) s = lat;
      if (lng > e) e = lng;
      if (lat > n) n = lat;
    }
  }
  if (!isFinite(w)) return [76.78, 43.13, 77.12, 43.36];
  return [w, s, e, n];
}

// ---------------------------------------------------------------------------
// Cell-center points — one Point feature per H3 cell center (Airly-style
// dense scatter of dots). Used by the Map screen's circle-marker layers
// instead of the polygon fills. Each point inherits {slug, nameRu, nameKk,
// risk} from its parent district; the client adds a literal `color`.
//
// h3-js v4: cellToLatLng(h3) → [lat, lng]; we flip to [lng, lat] for GeoJSON.
// ---------------------------------------------------------------------------

export interface CellPointFeature {
  type: "Feature";
  properties: HexFeatureProps;
  geometry: { type: "Point"; coordinates: [number, number] };
}

export interface CellPointCollection {
  type: "FeatureCollection";
  features: CellPointFeature[];
}

// ---------------------------------------------------------------------------
// Deterministic per-cell RNG. The dot field must look the SAME on every reload
// (no Math.random anywhere) so the scatter reads as a stable "sensor network",
// not a flickering cloud. We hash the h3 index string → uint32 seed and run a
// mulberry32 PRNG from it; every surviving dot draws its keep/jitter/size from
// that one seeded stream, so the layout is a pure function of (cell, risk).
// ---------------------------------------------------------------------------

/** FNV-1a hash of an h3 index string → uint32 seed. */
function hashH3(h3: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < h3.length; i++) {
    h ^= h3.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 PRNG: returns a thunk producing floats in [0, 1). Deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Per-cell keep probability from the district's risk. Dirtier districts get a
 * denser scatter (more "sensors where it matters"); clean ones sparser. Tuned
 * so the whole-city dot count lands ~30-45 at Almaty's ~114 res-8 cells.
 *   risk 1–3 → 0.18   (clean: sparse)
 *   risk 4–6 → 0.30   (moderate)
 *   risk 7+  → 0.45   (dirty: dense)
 */
function keepProbability(risk: number): number {
  if (risk >= 7) return 0.45;
  if (risk >= 4) return 0.3;
  return 0.18;
}

/** Max |Δlng| / |Δlat| from the cell center to any boundary vertex, in degrees.
 *  Used to scale jitter to the real cell size at this latitude (lng-degrees are
 *  shorter than lat-degrees at 43°N, so we keep them separate). */
function cellRadiiDeg(centerLng: number, centerLat: number, boundary: number[][]): {
  lng: number;
  lat: number;
} {
  if (!boundary || boundary.length === 0) {
    // Fallback: res-8 avg edge ~0.74 km → ~0.0067° lat, ~0.0091° lng at Almaty.
    return { lng: 0.0091, lat: 0.0067 };
  }
  let lngR = 0;
  let latR = 0;
  for (const [lng, lat] of boundary) {
    const dLng = Math.abs(lng - centerLng);
    const dLat = Math.abs(lat - centerLat);
    if (dLng > lngR) lngR = dLng;
    if (dLat > latR) latR = dLat;
  }
  return { lng: lngR, lat: latR };
}

/**
 * Build an ORGANIC, Airly-style scatter of cell-center points — NOT a regular
 * polka-dot grid. Three deterministic transforms per cell:
 *
 *   1. THIN — keep only ~p of cells (p = keepProbability(risk)). Risk-weighted
 *      so dirty districts read denser. Drop the rest entirely.
 *   2. JITTER — nudge each surviving dot up to ~35% of the cell radius along
 *      each axis, seeded from the h3 index. Breaks the readable hex lattice.
 *   3. SIZE — assign a solid radius in 4.5–7 px, biased toward small (squared
 *      uniform) so bigger dots are rarer; the glow layer scales with it.
 *
 * All randomness flows from mulberry32(hashH3(cell)) — same layout every load.
 * `riskBySlug` maps district slug → live risk (1..10). Cells are de-duplicated
 * by H3 index (first district wins) so overlapping polygons never stack dots.
 */
export function buildCellPointsGeoJSON(
  districts: DistrictFC,
  riskBySlug: Record<string, number>,
  res = 8,
): CellPointCollection {
  const seen = new Set<string>();
  const features: CellPointFeature[] = [];

  for (const f of districts.features) {
    const slug = f.properties.slug;
    const rawRisk = riskBySlug[slug];
    const risk = Number.isFinite(Number(rawRisk)) ? Number(rawRisk) : 0;
    const p = keepProbability(risk);
    const rings = outerRings(f.geometry);

    for (const ring of rings) {
      if (!ring || ring.length < 3) continue;
      let cells: string[] = [];
      try {
        cells = polygonToCells(ring, res, true);
      } catch {
        continue;
      }

      for (const cell of cells) {
        if (seen.has(cell)) continue;
        seen.add(cell);

        // One seeded RNG per cell — keep, jitter-x, jitter-y, size all draw
        // from this stream in fixed order, so the layout is deterministic.
        const rng = mulberry32(hashH3(cell));

        // 1) Thin: drop ~1-p of cells. No dot is emitted for dropped cells.
        if (rng() >= p) continue;

        let latLng: [number, number];
        try {
          latLng = cellToLatLng(cell);
        } catch {
          continue;
        }
        const centerLng = latLng[1];
        const centerLat = latLng[0];

        // 2) Jitter: seeded offset up to 35% of the per-axis cell radius.
        let boundary: number[][];
        try {
          boundary = cellToBoundary(cell, true);
        } catch {
          boundary = [];
        }
        const radii = cellRadiiDeg(centerLng, centerLat, boundary);
        const jLng = (rng() * 2 - 1) * 0.35 * radii.lng;
        const jLat = (rng() * 2 - 1) * 0.35 * radii.lat;

        // 3) Size: solid radius 4.5–7 px, biased toward small (squared uniform
        //    → bigger dots rarer). Glow layer scales off this in MapClient.
        const rRand = rng();
        const radius = 4.5 + rRand * rRand * 2.5;

        features.push({
          type: "Feature",
          properties: {
            slug,
            nameRu: f.properties.nameRu,
            nameKk: f.properties.nameKk,
            risk,
            radius,
          },
          geometry: {
            type: "Point",
            coordinates: [centerLng + jLng, centerLat + jLat],
          },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

/** LngLat bounds [west, south, east, north] for a cell-point collection. */
export function pointsBounds(fc: CellPointCollection): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const f of fc.features) {
    const [lng, lat] = f.geometry.coordinates;
    if (lng < w) w = lng;
    if (lat < s) s = lat;
    if (lng > e) e = lng;
    if (lat > n) n = lat;
  }
  if (!isFinite(w)) return [76.78, 43.13, 77.12, 43.36];
  return [w, s, e, n];
}
