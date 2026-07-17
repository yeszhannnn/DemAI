/**
 * scripts/seed-diary.ts — `npm run seed:diary -- <anonId>`
 *
 * Inserts 8 SYNTHETIC diary rows for the given anon id so the self-learning
 * loop (PROMPTS §11) can close and produce a personal PM2.5 threshold without
 * waiting 7 real days. The rows use the SAME diary table and the SAME
 * recompute path as the Telegram callback / the in-app modal — no extra
 * columns, no special seed flag.
 *
 * The 8 rows span the last 8 days (Asia/Almaty). Three of them are
 * feeling=3 («Плохо») with pm25 = [30, 35, 40] → median 35 → threshold 35
 * (clamped within [20, 80]). The other five are feeling 1/2 so the total
 * count clears the 7-row minimum.
 *
 * If the anon id has no profile row yet, a minimal neutral profile is created
 * (district = bostandyk, lang = ru) so `recomputePersonalPm25` has somewhere
 * to persist the threshold — otherwise /api/me would keep returning null.
 *
 * Every row is logged clearly as SYNTHETIC SEED, and the exact SQL to undo the
 * seed is printed at the end.
 */

import { promises as fs } from "fs";
import path from "path";
import {
  getProfile,
  recomputePersonalPm25,
  upsertDiary,
  upsertProfile,
} from "../lib/supabase";
import { almatyDate } from "../lib/tg";
import { NEUTRAL_PROFILE } from "../lib/compose";

interface SeedRow {
  dayOffset: number; // 0 = today, 7 = a week ago
  feeling: 1 | 2 | 3;
  pm25: number;
  riskShown: number;
}

// Ordered oldest → newest. Three feeling=3 rows (bad) with pm25 30/35/40.
const SEED_ROWS: SeedRow[] = [
  { dayOffset: 7, feeling: 1, pm25: 10, riskShown: 3 },
  { dayOffset: 6, feeling: 2, pm25: 18, riskShown: 4 },
  { dayOffset: 5, feeling: 1, pm25: 12, riskShown: 3 },
  { dayOffset: 4, feeling: 3, pm25: 30, riskShown: 7 },
  { dayOffset: 3, feeling: 2, pm25: 22, riskShown: 5 },
  { dayOffset: 2, feeling: 3, pm25: 35, riskShown: 7 },
  { dayOffset: 1, feeling: 2, pm25: 20, riskShown: 5 },
  { dayOffset: 0, feeling: 3, pm25: 40, riskShown: 8 },
];

async function loadEnvLocal(): Promise<void> {
  // Same loader as scripts/tg-dev.ts — reads .env.local from cwd or the
  // workspace root (the repo keeps secrets at the workspace root).
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "..", ".env.local"),
  ];
  for (const file of candidates) {
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

function almatyDateDaysAgo(days: number): string {
  // almatyDate shifts by +6h then slices the calendar date; subtract a full
  // day per offset by going back 24h·offset from now.
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return almatyDate(d);
}

async function main(): Promise<void> {
  await loadEnvLocal();

  const anonId = process.argv[2];
  if (!anonId) {
    console.error("Usage: npm run seed:diary -- <anonId>");
    process.exit(1);
  }

  console.log("──────────────────────────────────────────────────────────");
  console.log("  SYNTHETIC SEED — DemAI diary");
  console.log(`  anon_id = ${anonId}`);
  console.log("──────────────────────────────────────────────────────────");

  // Ensure a profile row exists so recompute has somewhere to persist the
  // threshold. If a real profile already exists, leave it untouched.
  const existing = await getProfile(anonId);
  if (!existing) {
    console.log("  no profile found — creating a minimal neutral profile");
    await upsertProfile(anonId, { ...NEUTRAL_PROFILE, district: "bostandyk" }, "ru");
  } else {
    console.log("  profile found — leaving it untouched");
  }

  console.log("  inserting 8 synthetic diary rows:");
  for (const r of SEED_ROWS) {
    const date = almatyDateDaysAgo(r.dayOffset);
    await upsertDiary(anonId, date, r.feeling, r.riskShown, r.pm25);
    const feelingWord =
      r.feeling === 1 ? "Хорошо" : r.feeling === 2 ? "Так себе" : "Плохо";
    console.log(
      `    ${date}  feeling=${r.feeling} (${feelingWord})  pm25=${r.pm25}  risk_shown=${r.riskShown}   # SYNTHETIC SEED`,
    );
  }

  // Close the loop: recompute + persist the personal PM2.5 threshold.
  const { personalPm25, diaryCount } = await recomputePersonalPm25(anonId);

  console.log("──────────────────────────────────────────────────────────");
  console.log(`  recompute → personalPm25 = ${personalPm25 ?? "null"}  (diaryCount = ${diaryCount})`);
  console.log(`  GET /api/me?anonId=${anonId}`);
  console.log("──────────────────────────────────────────────────────────");
  console.log("  To undo this seed, run in the Supabase SQL editor:");
  console.log(`    delete from diary where anon_id = '${anonId}';`);
  console.log("  (then POST /api/diary once or GET /api/me — the threshold");
  console.log("   will recompute from whatever real rows remain.)");
  console.log("──────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
