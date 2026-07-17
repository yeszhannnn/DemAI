/**
 * lib/tg-bot.ts — grammY bot instance + handlers for the DemAI alert channel.
 *
 * Handlers:
 *   /start <anonId>  → upsert tg_links, reply with today's risk + 3 actions
 *                      (composed via the internal risk pipeline, RU/KK per
 *                      the stored profile lang).
 *   /now             → same on demand (looks the profile up by chat id).
 *   callback diary:1|2|3 → upsert today's diary row {feeling, risk_shown, pm25}
 *                      (risk + pm25 snapshotted from the pipeline at press
 *                      time) and edit the message to «Записал ✅».
 *
 * The crons reuse `sendMorning` / `sendEvening` to push to every linked chat.
 *
 * The bot is a process-wide singleton (guarded against Next dev HMR via a
 * global symbol) so handlers are registered exactly once.
 */

import { Bot, InlineKeyboard } from "grammy";

import {
  getProfile,
  getTgLinkByChat,
  listTgLinks,
  recomputePersonalPm25,
  upsertDiary,
  upsertTgLink,
} from "./supabase";
import {
  almatyDate,
  composeTelegram,
  diaryButtons,
  diarySavedText,
  eveningQuestion,
} from "./tg";
import type { Profile } from "./risk";
import type { Locale } from "./i18n";

const GLOBAL = globalThis as unknown as { __demaiBot?: BotState };

interface BotState {
  bot: Bot;
  ready: boolean;
}

function createBot(): BotState {
  // Read the token lazily so scripts (tg:dev) can load `.env.local` before
  // the bot is constructed.
  const token = process.env.TG_BOT_TOKEN ?? "";
  const bot = new Bot(token);
  registerHandlers(bot);
  return { bot, ready: true };
}

/** Singleton bot instance (created lazily so missing env doesn't break builds). */
export function getBot(): Bot {
  if (!GLOBAL.__demaiBot) GLOBAL.__demaiBot = createBot();
  return GLOBAL.__demaiBot.bot;
}

function parseAnonId(text: string): string | null {
  // /start <anonId> — grammY gives the raw text incl. the command.
  const m = text.match(/\/start\s+(\S+)/);
  return m ? m[1] : null;
}

async function replyWithRisk(
  bot: Bot,
  chatId: number,
  profile: Profile,
  lang: Locale,
): Promise<void> {
  const composed = await composeTelegram(profile, lang);
  await bot.api.sendMessage(chatId, composed.text);
}

function registerHandlers(bot: Bot): void {
  bot.command("start", async (ctx) => {
    const anonId = parseAnonId(ctx.message?.text ?? "");
    if (!anonId) {
      await ctx.reply("Откройте ссылку из приложения DemAI, чтобы привязать аккаунт.");
      return;
    }
    const chatId = ctx.chat.id;
    await upsertTgLink(anonId, chatId);

    const row = await getProfile(anonId);
    if (!row) {
      await ctx.reply("Профиль не найден — откройте DemAI и нажмите «Подключить» ещё раз.");
      return;
    }
    await replyWithRisk(bot, chatId, row.profile, row.lang as Locale);
  });

  bot.command("now", async (ctx) => {
    const chatId = ctx.chat.id;
    const link = await getTgLinkByChat(chatId);
    if (!link) {
      await ctx.reply("Сначала привяжите аккаунт по ссылке из приложения DemAI.");
      return;
    }
    const row = await getProfile(link.anon_id);
    if (!row) {
      await ctx.reply("Профиль не найден — откройте DemAI и нажмите «Подключить» ещё раз.");
      return;
    }
    await replyWithRisk(bot, chatId, row.profile, row.lang as Locale);
  });

  bot.callbackQuery(/^diary:([123])$/, async (ctx) => {
    const feeling = Number(ctx.match?.[1] ?? 0) as 1 | 2 | 3;
    const chatId = ctx.chat?.id;
    if (!chatId || !feeling) {
      await ctx.answerCallbackQuery();
      return;
    }
    const link = await getTgLinkByChat(chatId);
    if (!link) {
      await ctx.answerCallbackQuery({ text: "Аккаунт не привязан" });
      return;
    }
    const row = await getProfile(link.anon_id);
    if (!row) {
      await ctx.answerCallbackQuery({ text: "Профиль не найден" });
      return;
    }
    // Snapshot the risk shown + current pm25 at press time (lib/tg.ts).
    const composed = await composeTelegram(row.profile, row.lang as Locale);
    await upsertDiary(
      link.anon_id,
      almatyDate(),
      feeling,
      composed.risk,
      composed.pm25,
    );
    // Close the self-learning loop (PROMPTS §11.2): recompute the personal
    // PM2.5 threshold from the full diary and persist it into the profile.
    // Best-effort — a failure here must not break the diary confirmation.
    try {
      await recomputePersonalPm25(link.anon_id);
    } catch {
      /* threshold recompute is best-effort */
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(diarySavedText(row.lang as Locale));
  });
}

// --- cron helpers -----------------------------------------------------------

/** Send the morning template (risk + 3 actions) to one chat. */
export async function sendMorning(
  bot: Bot,
  chatId: number,
  profile: Profile,
  lang: Locale,
): Promise<void> {
  const composed = await composeTelegram(profile, lang);
  await bot.api.sendMessage(chatId, composed.text);
}

/** Send the evening «Как ты сегодня?» with three inline buttons. */
export async function sendEvening(
  bot: Bot,
  chatId: number,
  lang: Locale,
): Promise<void> {
  const labels = diaryButtons(lang);
  const kb = new InlineKeyboard()
    .text(labels.good, "diary:1")
    .text(labels.meh, "diary:2")
    .text(labels.bad, "diary:3");
  await bot.api.sendMessage(chatId, eveningQuestion(lang), { reply_markup: kb });
}

/** Iterate every linked chat, look up its profile, and push the morning msg. */
export async function pushMorningToAll(): Promise<{ ok: number; fail: number }> {
  const bot = getBot();
  const links = await listTgLinks();
  let ok = 0;
  let fail = 0;
  for (const link of links) {
    const row = await getProfile(link.anon_id);
    if (!row) {
      fail++;
      continue;
    }
    try {
      await sendMorning(bot, link.chat_id, row.profile, row.lang as Locale);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

/** Iterate every linked chat and push the evening question. */
export async function pushEveningToAll(): Promise<{ ok: number; fail: number }> {
  const bot = getBot();
  const links = await listTgLinks();
  let ok = 0;
  let fail = 0;
  for (const link of links) {
    const row = await getProfile(link.anon_id);
    const lang: Locale = row?.lang === "kk" ? "kk" : "ru";
    try {
      await sendEvening(bot, link.chat_id, lang);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}
