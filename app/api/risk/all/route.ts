/**
 * app/api/risk/all/route.ts — the map's one-shot feed (PROMPTS §9.1).
 *
 *   GET /api/risk/all
 *
 * Returns `[{ district, risk }]` for every Almaty district, composed through
 * the SAME pipeline as /api/risk (air + pollen + weather → computeRisk) with a
 * neutral default profile. The whole batch is cached 10 minutes via
 * `unstable_cache`. The map page tags every H3 hex with the matching risk.
 *
 * Demo path (DESIGN §7): when `?demo=1` or `DEMO=1`, read risks straight from
 * the committed `data/demo_snapshot.json` with zero network — the demo must
 * not depend on venue Wi-Fi.
 */

import { unstable_cache } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { DISTRICTS } from "@/data/districts";
import { composeRisk, NEUTRAL_PROFILE, type RiskResponse } from "@/lib/compose";

export const dynamic = "force-dynamic";

export interface DistrictRisk {
  district: string;
  risk: number;
}

interface SnapshotFile {
  generatedAt: string;
  districts: Record<string, RiskResponse>;
}

function isDemoRequest(demoParam: string | null): boolean {
  return demoParam === "1" || process.env.DEMO === "1";
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
// 10-minute cached batch composition. One cache entry for the whole city.
// ---------------------------------------------------------------------------

const cachedAll = unstable_cache(
  async (): Promise<DistrictRisk[]> => {
    const out: DistrictRisk[] = [];
    for (const d of DISTRICTS) {
      const profile = { ...NEUTRAL_PROFILE, district: d.slug };
      try {
        const res = await composeRisk(d, profile);
        out.push({ district: d.slug, risk: res.risk });
      } catch {
        // A single district failure must not blank the whole map.
        out.push({ district: d.slug, risk: 0 });
      }
    }
    return out;
  },
  ["risk-all-v1"],
  { revalidate: 600 }, // 10 minutes
);

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const demo = isDemoRequest(searchParams.get("demo"));

  if (demo) {
    const snapshot = await readSnapshot();
    if (snapshot) {
      const out: DistrictRisk[] = DISTRICTS.map((d) => ({
        district: d.slug,
        risk: snapshot.districts?.[d.slug]?.risk ?? 0,
      }));
      return NextResponse.json(out, {
        headers: { "cache-control": "public, max-age=60" },
      });
    }
    return NextResponse.json(
      { error: "demo snapshot missing — run `npm run snapshot`" },
      { status: 503 },
    );
  }

  try {
    const result = await cachedAll();
    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=60" },
    });
  } catch (err) {
    // Last resort: fall back to the snapshot so the map never stays empty.
    const snapshot = await readSnapshot();
    if (snapshot) {
      const out: DistrictRisk[] = DISTRICTS.map((d) => ({
        district: d.slug,
        risk: snapshot.districts?.[d.slug]?.risk ?? 0,
      }));
      return NextResponse.json(out, {
        headers: { "cache-control": "public, max-age=60" },
      });
    }
    return NextResponse.json(
      { error: "composition failed", message: String(err) },
      { status: 502 },
    );
  }
}
