/**
 * lib/weather.ts — Open-Meteo forecast adapter (PROMPTS §5.3).
 *
 * Fetches the next ~24h of hourly forecast:
 *   wind_speed_10m, relative_humidity_2m, precipitation, temperature_2m
 * from the Open-Meteo forecast API (no key). Wind is returned by the API in
 * km/h; we convert to m/s for the risk engine (lib/risk.ts fWx expects m/s).
 *
 * The risk route uses the current hour for `computeRisk` and recomputes fWx
 * per hour for the 14-hour forecast, holding PM2.5 constant.
 */

import { isDemo } from "./demo";

export interface WeatherHour {
  /** Local ISO time string from the API (timezone=auto). */
  iso: string;
  /** Wind speed in m/s. */
  windMs: number;
  /** Relative humidity, %. */
  humidity: number;
  /** Precipitation, mm. */
  precipMm: number;
  /** Temperature, °C. */
  tempC: number;
}

export interface WeatherForecast {
  /** The hour matching "now" (first entry of `hourly`). */
  current: WeatherHour;
  /** Current hour followed by the next 24 hours (length 25). */
  hourly: WeatherHour[];
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

interface OMFResponse {
  hourly?: {
    time?: string[];
    wind_speed_10m?: number[];
    relative_humidity_2m?: number[];
    precipitation?: number[];
    temperature_2m?: number[];
  };
  hourly_units?: Record<string, string>;
}

const EMPTY_FORECAST: WeatherForecast = {
  current: { iso: "", windMs: 0, humidity: 0, precipMm: 0, tempC: 0 },
  hourly: [],
};

/**
 * Fetch the next 24h of hourly weather for (lat, lon).
 * In demo mode this is not called (the route serves the snapshot); it is
 * guarded so a stray call returns an empty forecast instead of hitting the
 * network.
 */
export async function getWeather(
  lat: number,
  lon: number,
): Promise<WeatherForecast> {
  if (isDemo()) return EMPTY_FORECAST;

  const url =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,relative_humidity_2m,precipitation,temperature_2m` +
    `&forecast_days=2&timezone=auto`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return EMPTY_FORECAST;
  }
  if (!res.ok) return EMPTY_FORECAST;

  const json = (await res.json()) as OMFResponse;
  const h = json.hourly;
  if (!h?.time || !h.time.length) return EMPTY_FORECAST;

  const windUnit = json.hourly_units?.wind_speed_10m ?? "kmh";
  const windFactor = windUnit === "ms" ? 1 : 1 / 3.6; // kmh → m/s

  const all: WeatherHour[] = h.time.map((iso, i) => ({
    iso,
    windMs: (h.wind_speed_10m?.[i] ?? 0) * windFactor,
    humidity: h.relative_humidity_2m?.[i] ?? 0,
    precipMm: h.precipitation?.[i] ?? 0,
    tempC: h.temperature_2m?.[i] ?? 0,
  }));

  // Find the index of the current hour (by matching YYYY-MM-DDTHH against now,
  // local to the API's timezone — the API returns local ISO strings).
  const now = new Date();
  const nowKey = localHourKey(now);
  let startIdx = all.findIndex((wh) => wh.iso.startsWith(nowKey));
  if (startIdx < 0) {
    // Fallback: first hour whose iso is >= nowKey-ish, else 0.
    startIdx = Math.max(0, all.length - 25);
  }

  const hourly = all.slice(startIdx, startIdx + 25);
  if (!hourly.length) return EMPTY_FORECAST;
  return { current: hourly[0], hourly };
}

/** YYYY-MM-DDTHH (first 13 chars of a local ISO string) for a Date. */
function localHourKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}`
  );
}
