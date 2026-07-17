/**
 * app/map/page.tsx — DESIGN §5.3 / PROMPTS §9 (server entry).
 *
 * Reads `data/almaty_districts.geojson` on the server (a raw OSM national
 * export, ~6.5MB), normalizes it to the 8 Almaty city districts in the app's
 * `{slug, nameRu, nameKk}` schema (lib/districts-geo.ts), and hands the clean
 * FeatureCollection to the client `MapClient`, which owns the MapLibre + H3
 * hex layer. Everything below is plain data plumbing — no UI.
 *
 * The parsed+normalized FC is cached at module scope so the 6.5MB file is only
 * read and parsed once per server process, not on every request.
 */
import { promises as fs } from "fs";
import path from "path";
import { MapClient } from "./MapClient";
import { normalizeDistrictsGeo } from "@/lib/districts-geo";
import type { DistrictFC } from "@/lib/hex";

export const dynamic = "force-dynamic";

let cache: DistrictFC | null = null;

async function getDistricts(): Promise<DistrictFC> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "almaty_districts.geojson");
  const raw = await fs.readFile(file, "utf8");
  cache = normalizeDistrictsGeo(JSON.parse(raw));
  return cache;
}

export default async function MapPage() {
  const districtsFC = await getDistricts();
  return <MapClient districtsFC={districtsFC} />;
}
