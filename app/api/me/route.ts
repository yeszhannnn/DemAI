/**
 * app/api/me/route.ts — GET /api/me?anonId=<uuid>
 *
 * The client's one-shot sync point for the self-learning loop (PROMPTS §11.3).
 * On app open, `useProfile` fetches this once and mirrors `personalPm25` into
 * the local profile so `computeRisk` (Prompt 3) and the WhyCard line (§11.4)
 * reflect the threshold calibrated from the diary.
 *
 * Response: { personalPm25: number | null, diaryCount: number, todayMarked: boolean }
 *   - personalPm25 is null when the loop is still open (< 7 diary days or
 *     < 3 «Плохо» rows) — the client then drops the field from the profile.
 *   - diaryCount is the total rows for this anon id (drives the «N/7» copy).
 *   - todayMarked is true when today's row already exists (Asia/Almaty date) —
 *     drives the persistent «Сегодня: отмечено ✓» caption under the diary
 *     capsule, and survives reload / a Telegram write of the same row.
 *
 * The threshold is recomputed on every diary write (tg callback + POST
 * /api/diary), so this route is a pure read — no recompute here.
 */

import { NextResponse } from "next/server";
import { getDiaryRow, getProfile, listDiary } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** YYYY-MM-DD in Asia/Almaty (UTC+6, no DST) — matches the diary `date` column. */
function almatyDate(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const anonId = searchParams.get("anonId") ?? "";
  if (!anonId) {
    return NextResponse.json({ error: "anonId required" }, { status: 400 });
  }
  const row = await getProfile(anonId);
  if (!row) {
    return NextResponse.json({
      personalPm25: null,
      diaryCount: 0,
      todayMarked: false,
    });
  }
  const diary = await listDiary(anonId);
  const today = await getDiaryRow(anonId, almatyDate());
  const personalPm25 =
    typeof row.profile.personalPm25 === "number"
      ? row.profile.personalPm25
      : null;
  return NextResponse.json(
    {
      personalPm25,
      diaryCount: diary.length,
      todayMarked: today !== null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
