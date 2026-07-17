/**
 * app/api/link/route.ts — POST /api/link
 *
 * Called by the BotBanner (Detail screen) BEFORE opening the Telegram deep
 * link `https://t.me/<NEXT_PUBLIC_TG_BOT>?start=<anonId>`. Upserts the
 * anonymous profile snapshot into `profiles` so the bot's /start handler can
 * compose the risk for the right user + locale.
 *
 * Body: { anonId: string, profile: Profile, lang: "ru" | "kk" }
 *
 * This is a server-only write (lib/supabase.ts service-role); the web client
 * never touches Supabase directly.
 */

import { NextResponse } from "next/server";
import { upsertProfile } from "@/lib/supabase";
import type { Profile } from "@/lib/risk";

export const dynamic = "force-dynamic";

interface LinkBody {
  anonId?: unknown;
  profile?: unknown;
  lang?: unknown;
}

function isProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.who === "string" &&
    typeof p.diagnosis === "string" &&
    Array.isArray(p.triggers) &&
    typeof p.district === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: LinkBody;
  try {
    body = (await request.json()) as LinkBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const anonId = typeof body.anonId === "string" ? body.anonId : "";
  if (!anonId) {
    return NextResponse.json({ error: "anonId required" }, { status: 400 });
  }
  if (!isProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  const lang = body.lang === "kk" ? "kk" : "ru";

  try {
    await upsertProfile(anonId, body.profile, lang);
    return NextResponse.json({ ok: true, anonId, lang });
  } catch (err) {
    return NextResponse.json(
      { error: "upsert failed", message: String(err) },
      { status: 500 },
    );
  }
}
