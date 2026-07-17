/**
 * app/api/cron/morning/route.ts — GET /api/cron/morning
 *
 * Vercel cron: `30 2 * * *` UTC = 07:30 Asia/Almaty (UTC+6, no DST).
 * For every tg_link, compute the risk and send the morning template with the
 * 3 actions (lib/tg-bot.ts → pushMorningToAll).
 *
 * Auth: header `authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse } from "next/server";
import { pushMorningToAll } from "@/lib/tg-bot";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { ok, fail } = await pushMorningToAll();
    return NextResponse.json({ ok: true, sent: ok, fail });
  } catch (err) {
    return NextResponse.json(
      { error: "morning push failed", message: String(err) },
      { status: 500 },
    );
  }
}
