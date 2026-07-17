/**
 * app/api/cron/evening/route.ts — GET /api/cron/evening
 *
 * Vercel cron: `0 15 * * *` UTC = 20:00 Asia/Almaty (UTC+6, no DST).
 * Send «Как ты сегодня?» to every linked chat with three inline buttons
 * Хорошо / Так себе / Плохо (callback_data diary:1|2|3). The button press is
 * handled by the webhook (lib/tg-bot.ts) and writes today's diary row.
 *
 * Auth: header `authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse } from "next/server";
import { pushEveningToAll } from "@/lib/tg-bot";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { ok, fail } = await pushEveningToAll();
    return NextResponse.json({ ok: true, sent: ok, fail });
  } catch (err) {
    return NextResponse.json(
      { error: "evening push failed", message: String(err) },
      { status: 500 },
    );
  }
}
