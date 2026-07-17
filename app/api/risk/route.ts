/**
 * app/api/risk/route.ts — the one clean API the whole app consumes (PROMPTS §5.4).
 *
 *   GET /api/risk?district=<slug>&p=<base64 profile>
 *
 * Composes air (WAQI) + pollen (GDD) + weather (Open-Meteo) → computeRisk now,
 * plus a 14-hour forecast, verdict, breakdown, pm25, pollen, sparse. The
 * composed response is cached 10 minutes per (district, profile) via
 * `unstable_cache`.
 *
 * Demo path (DESIGN §7): when `?demo=1` or `DEMO=1`, serve the committed
 * `data/demo_snapshot.json` with zero network — the demo must not depend on
 * venue Wi-Fi.
 */

import { unstable_cache } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getDistrict } from "@/data/districts";
import {
  composeRisk,
  NEUTRAL_PROFILE,
  type RiskResponse,
} from "@/lib/compose";
import { demoHourly } from "@/lib/demo-forecast";
import type { Profile } from "@/lib/risk";

export const dynamic = "force-dynamic";

interface SnapshotFile {
  generatedAt: string;
  districts: Record<string, RiskResponse>;
}

function isDemoRequest(demoParam: string | null): boolean {
  return demoParam === "1" || process.env.DEMO === "1";
}

function decodeProfile(p: string | null): Profile {
  if (!p) return { ...NEUTRAL_PROFILE };
  try {
    const json = Buffer.from(p, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<Profile>;
    return { ...NEUTRAL_PROFILE, ...parsed };
  } catch {
    return { ...NEUTRAL_PROFILE };
  }
}

async function readSnapshot(): Promise<SnapshotFile | null> {
  try {
    const file = path.join(process.cwd(), "data", "demo_snapshot.json");
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as SnapshotFile;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 10-minute cached composition per (district, profileKey).
// ---------------------------------------------------------------------------

const cachedCompose = unstable_cache(
  async (slug: string, profileKey: string, profile: Profile): Promise<RiskResponse> => {
    const district = getDistrict(slug)!;
    return composeRisk(district, profile);
  },
  ["risk-compose-v1"],
  { revalidate: 600 }, // 10 minutes
);

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("district") ?? "bostandyk";
  const district = getDistrict(slug);

  if (!district) {
    return NextResponse.json(
      { error: "unknown district", slug },
      { status: 404 },
    );
  }

  const demo = isDemoRequest(searchParams.get("demo"));

  if (demo) {
    const snapshot = await readSnapshot();
    const entry = snapshot?.districts?.[slug] ?? snapshot?.districts?.["bostandyk"];
    if (entry) {
      // DEMO-only: replace the snapshot's flat hourly risks with a smooth,
      // deterministic daily curve (lib/demo-forecast). Real path is untouched.
      const demoEntry = { ...entry, hourly: demoHourly(entry.hourly) };
      return NextResponse.json(demoEntry, {
        headers: { "cache-control": "public, max-age=60" },
      });
    }
    return NextResponse.json(
      { error: "demo snapshot missing — run `npm run snapshot`" },
      { status: 503 },
    );
  }

  const profile = decodeProfile(searchParams.get("p"));
  const profileKey = searchParams.get("p") ?? "neutral";

  try {
    const result = await cachedCompose(slug, profileKey, profile);
    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=60" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "composition failed", message: String(err) },
      { status: 502 },
    );
  }
}
