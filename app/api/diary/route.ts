/**
 * app/api/diary/route.ts — POST /api/diary
 *
 * The in-app diary fallback for users without Telegram (PROMPTS §11.5). The
 * BotBanner section shows a «Отметить самочувствие» capsule that opens a bottom
 * sheet with the same three buttons (Хорошо / Так себе / Плохо). This route is
 * the write target — it uses the SAME diary table and the SAME recompute as the
 * Telegram callback path, so the loop is identical.
 *
 * Body: { anonId: string, feeling: 1|2|3, riskShown?: number, pm25?: number }
 *
 * `riskShown` and `pm25` are snapshotted CLIENT-side from the live RiskResponse
 * the Detail screen already holds (data.risk + data.pm25.ug) — the client owns
 * the "what was shown" truth. When omitted (e.g. a future programmatic caller),
 * the route falls back to composing them server-side via lib/tg.ts, exactly
 * like the Telegram callback, so the row is never written with placeholders.
 *
 * One entry per day: the (anon_id, date) unique constraint makes the upsert
 * overwrite today's row if it already exists. The response carries `updated`
 * so the sheet can say «Записано ✓» on first write and «Обновлено ✓» on repeat.
 *
 * Response: { ok: true, personalPm25: number | null, diaryCount: number, updated: boolean }
 */

import { NextResponse } from "next/server";
import {
  getDiaryRow,
  getProfile,
  recomputePersonalPm25,
  upsertDiary,
} from "@/lib/supabase";
import { almatyDate, composeTelegram } from "@/lib/tg";

export const dynamic = "force-dynamic";

interface DiaryBody {
  anonId?: unknown;
  feeling?: unknown;
  riskShown?: unknown;
  pm25?: unknown;
}

function isFeeling(v: unknown): v is 1 | 2 | 3 {
  return v === 1 || v === 2 || v === 3;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function POST(request: Request): Promise<Response> {
  let body: DiaryBody;
  try {
    body = (await request.json()) as DiaryBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const anonId = typeof body.anonId === "string" ? body.anonId : "";
  if (!anonId) {
    return NextResponse.json({ error: "anonId required" }, { status: 400 });
  }
  if (!isFeeling(body.feeling)) {
    return NextResponse.json({ error: "feeling must be 1, 2 or 3" }, { status: 400 });
  }

  const row = await getProfile(anonId);
  if (!row) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const date = almatyDate();
  // One entry per day: if today's row exists, this is an update (§11.5 guard).
  const existing = await getDiaryRow(anonId, date);
  const updated = existing !== null;

  // Snapshot the risk shown + ambient pm25 at press time. Prefer the client's
  // values (the "what was shown" truth); fall back to a server-side compose.
  let riskShown: number;
  let pm25: number;
  if (isNumber(body.riskShown) && isNumber(body.pm25)) {
    riskShown = Math.max(1, Math.min(10, Math.round(body.riskShown)));
    pm25 = Math.max(0, body.pm25);
  } else {
    const composed = await composeTelegram(row.profile, row.lang as "ru" | "kk");
    riskShown = composed.risk;
    pm25 = composed.pm25;
  }

  try {
    await upsertDiary(anonId, date, body.feeling, riskShown, pm25);
  } catch (err) {
    return NextResponse.json(
      { error: "diary write failed", message: String(err) },
      { status: 500 },
    );
  }

  try {
    const { personalPm25, diaryCount } = await recomputePersonalPm25(anonId);
    return NextResponse.json({ ok: true, personalPm25, diaryCount, updated });
  } catch (err) {
    return NextResponse.json(
      { error: "threshold recompute failed", message: String(err) },
      { status: 500 },
    );
  }
}
