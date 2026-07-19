/**
 * lib/point-in-polygon.ts — pure ray-cast point-in-polygon for the Map search
 * (PROMPTS §9.3). Determines which Almaty district polygon contains a
 * geocoded [lng,lat], or — when the point falls outside all 8 districts — the
 * nearest district by centroid distance (for the «Адрес вне зоны покрытия»
 * sheet).
 *
 * No turf dependency: a small ray-cast helper handles GeoJSON Polygon and
 * MultiPolygon geometries. Pure + synchronous, no DOM, no network.
 */

import type { DistrictFC } from "@/lib/hex";
import { DISTRICTS } from "@/data/districts";

type Ring = number[][]; // [lng,lat][]
type Polygon = Ring[]; // outer + holes
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };

/** Classic even-odd ray-cast. A point on an edge/vertex counts as inside. */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Polygon: point must be in the outer ring and NOT in any hole. */
function pointInPolygon(lng: number, lat: number, poly: Polygon): boolean {
  if (!poly || poly.length === 0) return false;
  if (!pointInRing(lng, lat, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) {
    if (pointInRing(lng, lat, poly[h])) return false; // inside a hole
  }
  return true;
}

function geometryOf(f: DistrictFC["features"][number]): Geometry | null {
  const g = f.geometry as { type?: string; coordinates?: unknown };
  if (!g || !g.coordinates) return null;
  if (g.type === "Polygon") {
    return { type: "Polygon", coordinates: g.coordinates as Polygon };
  }
  if (g.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: g.coordinates as Polygon[] };
  }
  return null;
}

export interface DistrictHit {
  slug: string;
  nameRu: string;
  nameKk: string;
  /** True when the point is strictly inside a district polygon.
   *  False when the point is outside all districts and `slug` is the nearest
   *  district (by centroid) — used to show the «Адрес вне зоны покрытия»
   *  caption while still surfacing the nearest district's risk. */
  inside: boolean;
}

/**
 * Resolve a [lng,lat] to the district that contains it, or — when the point
 * is outside all 8 districts — the nearest district by centroid distance.
 * `districtsFC` is the normalized 8-district FeatureCollection (from
 * app/map/page.tsx); centroids come from data/districts.ts.
 */
export function districtAt(
  lng: number,
  lat: number,
  districtsFC: DistrictFC,
): DistrictHit | null {
  for (const f of districtsFC.features) {
    const geom = geometryOf(f);
    if (!geom) continue;
    if (geom.type === "Polygon") {
      if (pointInPolygon(lng, lat, geom.coordinates)) {
        return {
          slug: f.properties.slug,
          nameRu: f.properties.nameRu,
          nameKk: f.properties.nameKk,
          inside: true,
        };
      }
    } else {
      for (const poly of geom.coordinates) {
        if (pointInPolygon(lng, lat, poly)) {
          return {
            slug: f.properties.slug,
            nameRu: f.properties.nameRu,
            nameKk: f.properties.nameKk,
            inside: true,
          };
        }
      }
    }
  }

  // Outside all 8 → nearest district by centroid (haversine, no sqrt needed
  // for comparison). Falls back to null only if DISTRICTS is empty.
  let best: { slug: string; nameRu: string; nameKk: string; d: number } | null = null;
  for (const d of DISTRICTS) {
    const dLat = lat - d.lat;
    const dLng = lng - d.lon;
    const dist = dLat * dLat + dLng * dLng;
    if (!best || dist < best.d) {
      best = { slug: d.slug, nameRu: d.nameRu, nameKk: d.nameKk, d: dist };
    }
  }
  if (!best) return null;
  return { slug: best.slug, nameRu: best.nameRu, nameKk: best.nameKk, inside: false };
}
