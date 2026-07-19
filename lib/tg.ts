/**
 * lib/tg.ts — Telegram message composition for the alert channel.
 *
 * Composes the morning push (and the on-demand /start + /now reply) from the
 * SAME risk pipeline the Detail screen uses (lib/compose → lib/risk +
 * lib/actions), so the bot and the web app never disagree on a number.
 *
 * Locale: RU / KK per the stored `profiles.lang`. Wording follows DESIGN §6
 * (verdicts + chips) and §5.1.3 (action reminders — never prescriptions).
 */

import { getDistrict } from "@/data/districts";
import { composeRisk, type RiskResponse } from "./compose";
import { pickActions, type ActionEntry } from "./actions";
import type { Profile } from "./risk";
import type { Locale } from "./i18n";

export interface ComposedTelegram {
  /** Risk 1..10 shown to the user (also snapshotted into `diary.risk_shown`). */
  risk: number;
  /** Current PM2.5 in µg/m³ (snapshotted into `diary.pm25`). */
  pm25: number;
  /** The morning / on-demand message body. */
  text: string;
  /** The underlying composed response (kept for callers that need more). */
  response: RiskResponse;
  /** The 3 actions picked for this context. */
  actions: ActionEntry[];
}

const FALLBACK_SLUG = "bostandyk";

function districtFor(profile: Profile): { slug: string; lat: number; lon: number } {
  const d = getDistrict(profile.district) ?? getDistrict(FALLBACK_SLUG)!;
  return { slug: d.slug, lat: d.lat, lon: d.lon };
}

function districtName(slug: string, lang: Locale): string {
  const d = getDistrict(slug) ?? getDistrict(FALLBACK_SLUG)!;
  return lang === "kk" ? d.nameKk : d.nameRu;
}

/**
 * Compose the morning / on-demand message for a profile. Runs the full risk
 * pipeline (WAQI + Open-Meteo + GDD) — same as the web app.
 */
export async function composeTelegram(
  profile: Profile,
  lang: Locale,
): Promise<ComposedTelegram> {
  const district = districtFor(profile);
  const response = await composeRisk(district, profile);

  const actions = pickActions({
    risk: response.risk,
    diagnosis: profile.diagnosis,
    triggers: profile.triggers,
    pollen: response.pollen,
    weather: response.weather,
    hourly: response.hourly,
  });

  const text = formatMorning(response, profile, lang, actions);
  return {
    risk: response.risk,
    pm25: response.pm25.ug,
    text,
    response,
    actions,
  };
}

/** The morning / /start / /now message body — RU / KK. */
export function formatMorning(
  res: RiskResponse,
  profile: Profile,
  lang: Locale,
  actions: ActionEntry[],
): string {
  const kk = lang === "kk";
  const v = res.verdict;
  const chip = kk ? v.chipKk : v.chipRu;
  const verdict = kk ? v.textKk : v.textRu;
  const place = districtName(profile.district || FALLBACK_SLUG, lang);

  const actionLines = actions
    .map((a) => `• ${kk ? a.textKk : a.textRu}`)
    .join("\n");

  const tail = kk
    ? `PM2.5: ${res.pm25.ug} мкг/м³ · Тозаң ${res.pollen.wormwood}/5`
    : `PM2.5: ${res.pm25.ug} мкг/м³ · Полынь ${res.pollen.wormwood}/5`;

  return [
    `Алматы · ${place}`,
    `${kk ? "Қауіп деңгейі" : "Риск"} ${res.risk}/10 — ${chip}`,
    verdict,
    "",
    actionLines,
    "",
    tail,
  ].join("\n");
}

/** Evening question — DESIGN §5.1 diary strings. */
export function eveningQuestion(lang: Locale): string {
  return lang === "kk" ? "Бүгін қалай?" : "Как ты сегодня?";
}

/** Diary button labels (Хорошо / Так себе / Плохо) per locale. */
export function diaryButtons(lang: Locale): { good: string; meh: string; bad: string } {
  if (lang === "kk") return { good: "Жақсы", meh: "Қалыпты", bad: "Жаман" };
  return { good: "Хорошо", meh: "Так себе", bad: "Плохо" };
}

/** «Записал ✅» — the edit-message confirmation after a diary button press. */
export function diarySavedText(lang: Locale): string {
  return lang === "kk" ? "Жазып қойдым ✅" : "Записал ✅";
}

/** YYYY-MM-DD in Asia/Almaty (UTC+6) for the diary `date` column. */
export function almatyDate(d: Date = new Date()): string {
  // UTC+6, no DST. Shift by +6h then take the calendar date.
  const shifted = new Date(d.getTime() + 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}
