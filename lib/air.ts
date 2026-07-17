/**
 * lib/air.ts — WAQI geo-feed adapter (PROMPTS §5.2).
 *
 * Endpoint: https://api.waqi.info/feed/geo:{lat};{lon}/?token=<WAQI_TOKEN>
 *
 * IMPORTANT: WAQI's `iaqi.pm25.v` is a US EPA AQI value, NOT a µg/m³
 * concentration. The DemAI risk engine (lib/risk.ts) works in µg/m³, so we
 * invert the AQI back to an ambient concentration via the EPA PM2.5
 * breakpoint table below. The same is done for PM10 when present.
 *
 * `sparse=true` is returned when the feed is missing or the resolved station
 * is clearly city-level (no real district sensor nearby) — the UI then shows
 * the city-level risk with a "few sensors in your district" note (DESIGN §7).
 */

import { isDemo } from "./demo";

export interface AirReading {
  /** PM2.5 concentration in µg/m³ (recovered from US AQI). */
  pm25ug: number;
  /** PM10 concentration in µg/m³, when reported. */
  pm10ug?: number;
  /** Raw US AQI values, kept for transparency in the UI. */
  pm25aqi?: number;
  pm10aqi?: number;
  stationName?: string;
  /** Distance from the requested point to the station, in km. */
  stationDistKm?: number;
  /** True when the feed is missing or the station is city-level. */
  sparse: boolean;
}

// ---------------------------------------------------------------------------
// EPA breakpoint tables (US AQI). Each row: [cLo, cHi, iLo, iHi] where c is
// the 24-hour mean concentration in µg/m³ and i is the AQI. To convert AQI →
// µg/m³ we invert the linear interpolation: c = cLo + (a - iLo)/(iHi - iLo) * (cHi - cLo).
// Source: US EPA PM2.5 / PM10 AQI breakpoint tables (classic 2012 standard;
// WAQI's iaqi values are computed against these).
// ---------------------------------------------------------------------------

// PM2.5 (24-hr, µg/m³ → AQI)
const PM25_BANDS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 350.4, 301, 400],
  [350.5, 500.4, 401, 500],
];

// PM10 (24-hr, µg/m³ → AQI)
const PM10_BANDS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 504, 301, 400],
  [505, 604, 401, 500],
];

/** Invert an AQI value to a µg/m³ concentration via a breakpoint table. */
function aqiToUg(aqi: number, bands: ReadonlyArray<readonly [number, number, number, number]>): number {
  if (!Number.isFinite(aqi) || aqi <= 0) return 0;
  let prev: readonly [number, number, number, number] = [0, 0, 0, 0];
  for (const band of bands) {
    const [cLo, cHi, iLo, iHi] = band;
    if (aqi <= iHi) {
      const t = (aqi - iLo) / (iHi - iLo || 1);
      return cLo + t * (cHi - cLo);
    }
    prev = band;
  }
  // Above the highest band → extrapolate from the last band.
  const [cLo, cHi, iLo, iHi] = prev;
  return cHi + (aqi - iHi) * ((cHi - cLo) / (iHi - iLo || 1));
}

// ---------------------------------------------------------------------------
// Haversine distance (km) between two lat/lon points.
// ---------------------------------------------------------------------------

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ---------------------------------------------------------------------------
// WAQI response shapes (only the fields we read).
// ---------------------------------------------------------------------------

interface WaqiIaqi {
  pm25?: { v?: number };
  pm10?: { v?: number };
}

interface WaqiData {
  aqi?: number;
  idx?: number;
  city?: { name?: string; geo?: [number, number] };
  iaqi?: WaqiIaqi;
  dominentpol?: string;
}

interface WaqiResponse {
  status: string;
  data?: WaqiData;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const WAQI_BASE = "https://api.waqi.info/feed/geo:";

/** A neutral fallback used when the feed is entirely missing. */
const SPARSE_FALLBACK_UG = 0;

/**
 * Fetch the nearest WAQI station to (lat, lon) and convert to µg/m³.
 * In demo mode this function is not called (the route serves the snapshot),
 * but it is guarded so a stray call returns a sparse reading instead of
 * hitting the network.
 */
export async function getAirReading(
  lat: number,
  lon: number,
): Promise<AirReading> {
  if (isDemo()) {
    return { pm25ug: SPARSE_FALLBACK_UG, sparse: true };
  }

  const token = process.env.WAQI_TOKEN;
  if (!token) {
    return { pm25ug: SPARSE_FALLBACK_UG, sparse: true };
  }

  const url = `${WAQI_BASE}${lat};${lon}/?token=${token}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { pm25ug: SPARSE_FALLBACK_UG, sparse: true };
  }
  if (!res.ok) {
    return { pm25ug: SPARSE_FALLBACK_UG, sparse: true };
  }

  let json: WaqiResponse;
  try {
    json = (await res.json()) as WaqiResponse;
  } catch {
    return { pm25ug: SPARSE_FALLBACK_UG, sparse: true };
  }

  if (json.status !== "ok" || !json.data) {
    return { pm25ug: SPARSE_FALLBACK_UG, sparse: true };
  }

  const data = json.data;
  const pm25aqi = data.iaqi?.pm25?.v;
  const pm10aqi = data.iaqi?.pm10?.v;
  const stationName = data.city?.name;
  const stationGeo = data.city?.geo; // [lat, lon] of the station

  let stationDistKm: number | undefined;
  if (stationGeo && stationGeo.length === 2) {
    stationDistKm = haversineKm(
      { lat, lon },
      { lat: stationGeo[0], lon: stationGeo[1] },
    );
  }

  // Sparse heuristic: no pm25 iaqi at all, OR the resolved station is far away
  // (>15 km — clearly not in this district), OR the station name is just the
  // bare city name with no station-level detail (e.g. "Almaty").
  const bareCityName =
    !!stationName &&
    !stationName.includes(",") &&
    !stationName.includes("/") &&
    /almaty|алматы/i.test(stationName);

  let sparse = false;
  let pm25ug: number;
  let pm10ug: number | undefined;

  if (pm25aqi !== undefined && Number.isFinite(pm25aqi)) {
    pm25ug = aqiToUg(pm25aqi, PM25_BANDS);
  } else if (data.aqi !== undefined && Number.isFinite(data.aqi)) {
    // No pm25 iaqi — fall back to the overall AQI as a coarse proxy.
    pm25ug = aqiToUg(data.aqi, PM25_BANDS);
    sparse = true;
  } else {
    pm25ug = SPARSE_FALLBACK_UG;
    sparse = true;
  }

  if (pm10aqi !== undefined && Number.isFinite(pm10aqi)) {
    pm10ug = aqiToUg(pm10aqi, PM10_BANDS);
  }

  if (stationDistKm !== undefined && stationDistKm > 15) sparse = true;
  if (bareCityName) sparse = true;

  return {
    pm25ug,
    pm10ug,
    pm25aqi,
    pm10aqi,
    stationName,
    stationDistKm,
    sparse,
  };
}

// Exposed for tests.
export { aqiToUg };
