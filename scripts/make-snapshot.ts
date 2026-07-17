/**
 * scripts/make-snapshot.ts — `npm run snapshot`
 *
 * Fetches live data for all 8 Almaty districts with a neutral default profile
 * and writes `data/demo_snapshot.json` (the full response shape per district).
 * The committed snapshot powers DEMO=1 / ?demo=1 offline mode (DESIGN §7).
 *
 * NOTE: this script calls the live composition pipeline directly (it does NOT
 * go through the HTTP route), so it works without a running dev server. The
 * `isDemo()` guard inside the air/weather/pollen modules is forced off here
 * by unsetting DEMO for the process, so real network calls are made.
 */

import { promises as fs } from "fs";
import path from "path";
import { DISTRICTS } from "../data/districts";
import { composeRisk, NEUTRAL_PROFILE, type RiskResponse } from "../lib/compose";

interface SnapshotFile {
  generatedAt: string;
  districts: Record<string, RiskResponse>;
}

async function main() {
  // Force live network calls even if DEMO is set in the environment.
  delete process.env.DEMO;

  const districts: Record<string, RiskResponse> = {};
  let ok = 0;
  let fail = 0;

  for (const d of DISTRICTS) {
    const profile = { ...NEUTRAL_PROFILE, district: d.slug };
    try {
      const res = await composeRisk(d, profile);
      districts[d.slug] = res;
      ok++;
      console.log(
        `  ${d.slug.padEnd(10)} risk=${res.risk} pm25=${res.pm25.ug}µg/m³ sparse=${res.sparse}`,
      );
    } catch (e) {
      fail++;
      console.error(`  ${d.slug.padEnd(10)} FAILED: ${String(e)}`);
    }
  }

  const snapshot: SnapshotFile = {
    generatedAt: new Date().toISOString(),
    districts,
  };

  const out = path.join(process.cwd(), "data", "demo_snapshot.json");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(
    `\nDemAI snapshot — ${ok} ok, ${fail} failed → ${path.relative(process.cwd(), out)}`,
  );
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
