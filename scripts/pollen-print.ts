/**
 * scripts/pollen-print.ts — `npm run pollen:print`
 *
 * Prints today's Almaty pollen levels + accumulated GDD per species, then
 * writes the demo snapshot to `data/demo_pollen.json` so DEMO=1 works offline.
 */

import { promises as fs } from "fs";
import path from "path";
import { getPollenLevels, type City } from "../lib/pollen";

const ALMATY: City = { lat: 43.222, lon: 76.851 };

async function main() {
  const date = new Date();
  const first = await getPollenLevels(ALMATY, date);
  // Second call within the process proves the 24h cache works (logs once).
  const second = await getPollenLevels(ALMATY, date);

  const iso = date.toISOString().slice(0, 10);
  console.log(`\nDemAI pollen — Almaty (${iso})`);
  console.log("──────────────────────────────────────");
  console.log(`  Полынь  (wormwood): ${first.wormwood}/5   GDD ${first.gdd.wormwood.toFixed(0)}`);
  console.log(`  Амброзия (ragweed): ${first.ragweed}/5   GDD ${first.gdd.ragweed.toFixed(0)}`);
  console.log(`  Берёза    (birch): ${first.birch}/5   GDD ${first.gdd.birch.toFixed(0)}`);
  console.log(`  ${first.phaseNote.ru}`);
  console.log("──────────────────────────────────────");
  console.log(`cache: ${first === second ? "second call served from cache" : "no cache"}`);

  const out = path.join(process.cwd(), "data", "demo_pollen.json");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(first, null, 2) + "\n", "utf8");
  console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
