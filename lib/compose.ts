/**
 * lib/compose.ts — single composition pipeline feeding the whole app (PROMPTS §5.4).
 *
 * Air (WAQI) + Pollen (GDD) + Weather (Open-Meteo) → computeRisk now, plus a
 * 14-hour forecast (fWx recomputed per hour, PM2.5 held constant — see comment
 * in `composeHourly`). This is the ONE shape every screen consumes.
 */

import { getAirReading, type AirReading } from "./air";
import { getWeather, type WeatherForecast } from "./weather";
import {
  getPollenLevels,
  type PollenLevels,
} from "./pollen";
import {
  computeRisk,
  verdict as riskVerdict,
  type Profile,
  type Verdict,
  type BreakdownEntry,
} from "./risk";

export interface Pm25Payload {
  ug: number;
  aqi?: number;
  stationName?: string;
  stationDistKm?: number;
}

export interface WeatherPayload {
  windMs: number;
  humidity: number;
  precipMm: number;
  tempC: number;
}

export interface HourlyPoint {
  /** "сб 15:00" — short RU weekday + HH:MM (DESIGN §6). */
  hourLabel: string;
  risk: number;
}

export interface RiskResponse {
  district: string;
  generatedAt: string;
  risk: number;
  verdict: Verdict;
  breakdown: BreakdownEntry[];
  pm25: Pm25Payload;
  pm10?: { ug: number; aqi?: number };
  pollen: Pick<PollenLevels, "wormwood" | "ragweed" | "birch" | "phaseNote">;
  weather: WeatherPayload;
  hourly: HourlyPoint[];
  sparse: boolean;
}

/** A neutral default profile: pollinosis, all triggers, not sensitive (×1.0). */
export const NEUTRAL_PROFILE: Profile = {
  who: "self",
  diagnosis: "pollinosis",
  triggers: ["pm25", "wormwood", "birch", "ragweed"],
  district: "",
  sensitive: false,
};

const WEEKDAY_SHORT_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** "сб 15:00" from an ISO local-time string (YYYY-MM-DDTHH:MM...). */
function hourLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const wd = WEEKDAY_SHORT_RU[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${wd} ${hh}:${mm}`;
}

/**
 * Compose the full risk response for one district.
 *
 * Simplification for the hourly forecast: PM2.5 and pollen are held constant
 * (we have one air reading and one daily pollen level), and only the weather
 * factor fWx is recomputed per hour from the Open-Meteo forecast. Real PM2.5
 * varies sub-hourly, but WAQI gives a single current value; recomputing only
 * fWx keeps the forecast cheap and explainable without inventing data.
 */
export async function composeRisk(
  district: { slug: string; lat: number; lon: number },
  profile: Profile,
): Promise<RiskResponse> {
  const [air, weather, pollen] = await Promise.all([
    getAirReading(district.lat, district.lon),
    getWeather(district.lat, district.lon),
    getPollenLevels({ lat: district.lat, lon: district.lon }),
  ]);

  return buildResponse(district.slug, profile, air, weather, pollen);
}

/** Pure builder — also used by the snapshot script to avoid re-fetching. */
export function buildResponse(
  slug: string,
  profile: Profile,
  air: AirReading,
  weather: WeatherForecast,
  pollen: PollenLevels,
): RiskResponse {
  const pollenInput = {
    wormwood: pollen.wormwood,
    ragweed: pollen.ragweed,
    birch: pollen.birch,
  };

  const currentWx = {
    windMs: weather.current.windMs,
    humidity: weather.current.humidity,
    precipMm: weather.current.precipMm,
    tempC: weather.current.tempC,
  };

  const { risk, breakdown } = computeRisk(profile, {
    pm25: air.pm25ug,
    pollen: pollenInput,
    weather: currentWx,
  });

  // Hourly: next 14 hours (indices 1..14 of the 25h forecast, since [0] is now).
  // PM2.5 + pollen held constant; only fWx recomputed per hour.
  const hourly: HourlyPoint[] = [];
  for (let i = 1; i <= 14 && i < weather.hourly.length; i++) {
    const wh = weather.hourly[i];
    const { risk: hRisk } = computeRisk(profile, {
      pm25: air.pm25ug,
      pollen: pollenInput,
      weather: {
        windMs: wh.windMs,
        humidity: wh.humidity,
        precipMm: wh.precipMm,
        tempC: wh.tempC,
      },
    });
    hourly.push({ hourLabel: hourLabel(wh.iso), risk: hRisk });
  }

  return {
    district: slug,
    generatedAt: new Date().toISOString(),
    risk,
    verdict: riskVerdict(risk),
    breakdown,
    pm25: {
      ug: round1(air.pm25ug),
      aqi: air.pm25aqi,
      stationName: air.stationName,
      stationDistKm:
        air.stationDistKm !== undefined ? round1(air.stationDistKm) : undefined,
    },
    pm10:
      air.pm10ug !== undefined
        ? { ug: round1(air.pm10ug), aqi: air.pm10aqi }
        : undefined,
    pollen: {
      wormwood: pollen.wormwood,
      ragweed: pollen.ragweed,
      birch: pollen.birch,
      phaseNote: pollen.phaseNote,
    },
    weather: {
      windMs: round1(currentWx.windMs),
      humidity: Math.round(currentWx.humidity),
      precipMm: round1(currentWx.precipMm),
      tempC: Math.round(currentWx.tempC),
    },
    hourly,
    sparse: air.sparse,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
