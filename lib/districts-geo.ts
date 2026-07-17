/**
 * lib/districts-geo.ts — normalize the human-supplied Almaty districts GeoJSON
 * for the Map screen (PROMPTS §9.2 / DESIGN §5.3).
 *
 * The committed `data/almaty_districts.geojson` is a raw OSM administrative-
 * boundaries export of all of Kazakhstan (226 admin_level=6 features) with
 * properties `name` / `name_en` / `osm_id` — NOT the `{slug, nameRu, nameKk}`
 * schema the hex builder + preview sheet expect. This module filters it down
 * to the 8 Almaty *city* districts and rewrites each feature's properties to
 * the app's schema, using the canonical Russian/Kazakh names from
 * `data/districts.ts` so the map sheet stays consistent with /d/[slug].
 *
 * Matching is by normalized Kazakh name (lowercased, whitespace-stripped) so it
 * survives OSM casing quirks like "Түрксіб Ауданы" (capital А) and the ә/э
 * variant of "Әуезов". A same-named "Әл-Фараби ауданы" in Turkistan region is
 * correctly excluded because it isn't in the city-district map.
 */

import { getDistrict } from "@/data/districts";
import type { DistrictFC } from "@/lib/hex";

/** Normalized OSM name → app slug, for the 8 Almaty city districts. */
const NAME_TO_SLUG: Record<string, string> = {
  "әуезовауданы": "auezov",
  "алмалыауданы": "almaly",
  "медеуауданы": "medeu",
  "алатауауданы": "alatau",
  "жетісуауданы": "jetysu",
  "түрксібауданы": "turksib",
  "бостандықауданы": "bostandyk",
  "наурызбайауданы": "nauryzbai",
};

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

interface RawFeature {
  type: string;
  properties?: { name?: string; name_en?: string; [k: string]: unknown };
  geometry?: { type: string; coordinates: number[][][] | number[][][][] };
}

interface RawFC {
  type: string;
  features?: RawFeature[];
}

/**
 * Filter + normalize the raw OSM FeatureCollection to the 8 Almaty city
 * districts in the app's `{slug, nameRu, nameKk}` schema. Pure — no I/O.
 */
export function normalizeDistrictsGeo(raw: unknown): DistrictFC {
  const fc = raw as RawFC;
  const features = (fc?.features ?? []).filter((f) => {
    const slug = NAME_TO_SLUG[norm(f.properties?.name ?? "")];
    return Boolean(slug && f.geometry);
  });

  return {
    type: "FeatureCollection",
    features: features.map((f) => {
      const slug = NAME_TO_SLUG[norm(f.properties!.name ?? "")];
      const d = getDistrict(slug)!;
      return {
        type: "Feature",
        properties: { slug, nameRu: d.nameRu, nameKk: d.nameKk },
        geometry: {
          type: f.geometry!.type,
          coordinates: f.geometry!.coordinates,
        },
      };
    }),
  };
}
