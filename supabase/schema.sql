-- DemAI alert channel schema (server-only Supabase, service-role).
-- Run this once in the Supabase SQL editor. All writes go through the
-- service-role key (lib/supabase.ts); no Row-Level-Security policies are
-- needed because anon clients never touch these tables directly.
--
-- The three tables mirror the anonymous onboarding profile (lib/useProfile.ts):
-- the web app knows the user only by a locally-generated `anon_id` (UUID).
-- The Telegram bot links that `anon_id` to a `chat_id` via the /start deep link.

-- 1. profiles — the anonymous profile snapshot, written by POST /api/link
--    right before the BotBanner opens the `t.me/<BOT>?start=<anonId>` deep link.
create table if not exists public.profiles (
  anon_id     text primary key,
  profile     jsonb      not null,
  lang        text       not null default 'ru',
  updated_at  timestamptz not null default now()
);

-- 2. tg_links — the anonymous → Telegram chat binding, written by the bot's
--    /start <anonId> handler.
create table if not exists public.tg_links (
  anon_id     text primary key,
  chat_id     bigint     not null,
  created_at  timestamptz not null default now()
);

-- 3. diary — one row per (anon_id, date). The evening bot question writes
--    `feeling` (1=хорошо / 2=так себе / 3=плохо); `risk_shown` and `pm25` are
--    snapshotted from the risk pipeline at the moment the button is pressed,
--    so the 7-day diary can later calibrate the personal PM2.5 threshold
--    (lib/risk.ts `personalPm25`).
create table if not exists public.diary (
  id          bigserial primary key,
  anon_id     text       not null,
  date        date       not null,
  feeling     int        not null,
  risk_shown  int        not null,
  pm25        real       not null,
  constraint diary_anon_date_unique unique (anon_id, date)
);

-- Helpful for the cron "send to everyone" queries.
create index if not exists tg_links_chat_id_idx on public.tg_links (chat_id);
create index if not exists diary_anon_date_idx on public.diary (anon_id, date);

-- Refresh `updated_at` on profile upserts (the app also sets it explicitly,
-- but this keeps the column honest if someone edits the row by hand).
create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();
