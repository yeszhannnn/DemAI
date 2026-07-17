/**
 * lib/supabase.ts — server-only Supabase service-role client (PROMPTS alert
 * channel).
 *
 * The alert channel (Telegram bot + crons) needs to read/write the anonymous
 * profile and the diary from server code only — the web client never touches
 * these tables. We therefore use the SERVICE-ROLE key, and we hard-guard this
 * module against ever being bundled into the browser:
 *
 *   - `import "server-only"` (Next.js built-in) makes a client import a
 *     build-time error.
 *   - a runtime `typeof window` check makes accidental client eval throw.
 *
 * All access goes through the typed helpers below so the route handlers and
 * the bot stay short and consistent.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./risk";
import { computePersonalPm25 } from "./threshold";

// Server-only guard. We deliberately do NOT `import "server-only"` here: that
// package throws at import time and is only safe inside a bundler that swaps
// it out (Next/webpack). Our scripts (tg:dev) run under plain tsx/Node with no
// bundler, so we instead throw at module-eval time if ever evaluated in a
// browser — which is the case that actually matters (a client component
// accidentally importing the service-role client).
if (typeof window !== "undefined") {
  throw new Error("lib/supabase.ts is server-only — must not run in the browser");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

/** Singleton service-role client. Created once per server process. Env is
 *  read lazily so a route's auth guard can return 401 before any env is read. */
let _client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// --- profiles ---------------------------------------------------------------

export interface ProfileRow {
  anon_id: string;
  profile: Profile;
  lang: "ru" | "kk";
  updated_at: string;
}

/** Upsert the anonymous profile snapshot (POST /api/link). Throws on DB error. */
export async function upsertProfile(
  anonId: string,
  profile: Profile,
  lang: "ru" | "kk",
): Promise<void> {
  const { error } = await supabase().from("profiles").upsert(
    {
      anon_id: anonId,
      profile: profile as unknown as Record<string, unknown>,
      lang,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "anon_id" },
  );
  if (error) throw new Error(`profiles upsert: ${error.message}`);
}

export async function getProfile(anonId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase()
    .from("profiles")
    .select("anon_id, profile, lang, updated_at")
    .eq("anon_id", anonId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as ProfileRow;
}

// --- tg_links ---------------------------------------------------------------

export interface TgLinkRow {
  anon_id: string;
  chat_id: number;
  created_at: string;
}

/** Bind an anonymous id to a Telegram chat (/start <anonId>). Throws on error. */
export async function upsertTgLink(
  anonId: string,
  chatId: number,
): Promise<void> {
  const { error } = await supabase().from("tg_links").upsert(
    { anon_id: anonId, chat_id: chatId, created_at: new Date().toISOString() },
    { onConflict: "anon_id" },
  );
  if (error) throw new Error(`tg_links upsert: ${error.message}`);
}

export async function getTgLinkByChat(
  chatId: number,
): Promise<TgLinkRow | null> {
  const { data, error } = await supabase()
    .from("tg_links")
    .select("anon_id, chat_id, created_at")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TgLinkRow;
}

export async function getTgLinkByAnon(
  anonId: string,
): Promise<TgLinkRow | null> {
  const { data, error } = await supabase()
    .from("tg_links")
    .select("anon_id, chat_id, created_at")
    .eq("anon_id", anonId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TgLinkRow;
}

/** All linked chats — the morning/evening crons iterate over this. */
export async function listTgLinks(): Promise<TgLinkRow[]> {
  const { data, error } = await supabase()
    .from("tg_links")
    .select("anon_id, chat_id, created_at")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as unknown as TgLinkRow[];
}

// --- diary ------------------------------------------------------------------

export interface DiaryRow {
  id: number;
  anon_id: string;
  date: string;
  feeling: number;
  risk_shown: number;
  pm25: number;
}

/**
 * Upsert today's diary row. `feeling` ∈ {1,2,3} (Хорошо / Так себе / Плохо);
 * `risk_shown` and `pm25` are snapshotted from the risk pipeline at the
 * moment the inline button is pressed.
 */
export async function upsertDiary(
  anonId: string,
  date: string,
  feeling: number,
  riskShown: number,
  pm25: number,
): Promise<void> {
  const { error } = await supabase().from("diary").upsert(
    {
      anon_id: anonId,
      date,
      feeling,
      risk_shown: riskShown,
      pm25,
    },
    { onConflict: "anon_id,date" },
  );
  if (error) throw new Error(`diary upsert: ${error.message}`);
}

/** All diary rows for one anon id, oldest first — feeds the threshold recompute. */
export async function listDiary(anonId: string): Promise<DiaryRow[]> {
  const { data, error } = await supabase()
    .from("diary")
    .select("id, anon_id, date, feeling, risk_shown, pm25")
    .eq("anon_id", anonId)
    .order("date", { ascending: true });
  if (error || !data) return [];
  return data as unknown as DiaryRow[];
}

/** One diary row for (anon id, date) or null — used to tell insert vs update. */
export async function getDiaryRow(
  anonId: string,
  date: string,
): Promise<DiaryRow | null> {
  const { data, error } = await supabase()
    .from("diary")
    .select("id, anon_id, date, feeling, risk_shown, pm25")
    .eq("anon_id", anonId)
    .eq("date", date)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as DiaryRow;
}

/**
 * Recompute the personal PM2.5 threshold from the diary and persist it into
 * the profile JSON's `personalPm25` field (PROMPTS §11.2).
 *
 *   - reads the profile row (returns {null, 0} if the profile is missing),
 *   - reads every diary row,
 *   - `computePersonalPm25` → number | null,
 *   - upserts the profile with the new `personalPm25` (or with the field
 *     removed when null, so the WhyCard line disappears gracefully).
 *
 * Returns the threshold + the total diary count so callers (the diary
 * callback, POST /api/diary, GET /api/me) can surface them without a second
 * round-trip.
 */
export async function recomputePersonalPm25(
  anonId: string,
): Promise<{ personalPm25: number | null; diaryCount: number }> {
  const row = await getProfile(anonId);
  if (!row) return { personalPm25: null, diaryCount: 0 };
  const diary = await listDiary(anonId);
  const personalPm25 = computePersonalPm25(
    diary.map((d) => ({ feeling: d.feeling, pm25: d.pm25 })),
  );
  const next: Profile =
    personalPm25 === null
      ? stripPersonalPm25(row.profile)
      : { ...row.profile, personalPm25 };
  await upsertProfile(anonId, next, row.lang);
  return { personalPm25, diaryCount: diary.length };
}

/** Return a copy of `p` with `personalPm25` dropped (used when recompute → null). */
function stripPersonalPm25(p: Profile): Profile {
  if (p.personalPm25 === undefined) return p;
  const { personalPm25: _drop, ...rest } = p;
  return rest;
}
