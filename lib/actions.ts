/**
 * lib/actions.ts — the "3 действия на завтра" rule table (DESIGN §5.1.3, §8).
 *
 * A rule table of 10 reminder-style strings (RU + KK), each keyed by a set of
 * conditions over the live risk context (risk band, active triggers, weather,
 * hourly minimum, sport, inhaler, mask). `pickActions` selects the top-3 by
 * priority. Wording is ALWAYS a reminder ("проверь, что ингалятор с собой"),
 * never a prescription ("принимай лекарство") — per §8 hard rules.
 *
 * Pure TypeScript, deterministic, zero network. The `icon` field is a lucide
 * name key; the component maps it to a component (keeps this module React-free
 * and unit-testable).
 */

import type { Diagnosis, Trigger } from "./risk";

export interface ActionContext {
  risk: number;
  diagnosis: Diagnosis;
  triggers: Trigger[];
  pollen: { wormwood: number; ragweed: number; birch: number };
  weather: { windMs: number; humidity: number; precipMm: number; tempC: number };
  /** Next 14 hours of risk, oldest first (matches /api/risk `hourly`). */
  hourly: { risk: number }[];
}

export interface ActionEntry {
  id: string;
  textRu: string;
  textKk: string;
  /** lucide-react icon name key (mapped in the component). */
  icon: string;
  /** Higher = more important; pickActions returns the top-3. */
  priority: number;
}

interface Rule {
  id: string;
  textRu: string;
  textKk: string;
  icon: string;
  priority: number;
  match: (ctx: ActionContext) => boolean;
}

const hasPollenTrigger = (triggers: Trigger[]): boolean =>
  triggers.includes("wormwood") ||
  triggers.includes("birch") ||
  triggers.includes("ragweed");

const maxPollen = (p: ActionContext["pollen"]): number =>
  Math.max(p.wormwood, p.ragweed, p.birch);

/** Hourly minimum risk across the coming hours (windows-open window). */
function hourlyMin(hourly: { risk: number }[]): number {
  if (!hourly.length) return 10;
  return hourly.reduce((m, h) => Math.min(m, h.risk), hourly[0].risk);
}

/**
 * The 10 rules. Order does not matter — selection is by priority. Each text is
 * a reminder, never a prescription (§8).
 */
const RULES: Rule[] = [
  {
    id: "inhaler",
    textRu: "Проверьте, что ингалятор с собой",
    textKk: "Ингалятор жаныңызда екенін тексеріңіз",
    icon: "backpack",
    priority: 92,
    match: (c) => c.diagnosis === "asthma" || c.diagnosis === "both",
  },
  {
    id: "stay-home",
    textRu: "Сегодня лучше остаться дома",
    textKk: "Бүгін үйде отырған дұрыс",
    icon: "home",
    priority: 90,
    match: (c) => c.risk >= 9,
  },
  {
    id: "windows-closed",
    textRu: "Держите окна закрытыми до вечера",
    textKk: "Терезені кешке дейін жабық ұстаңыз",
    icon: "wind",
    priority: 86,
    match: (c) => c.risk >= 7,
  },
  {
    id: "mask",
    textRu: "На улице — маска или дистанция",
    textKk: "Көшеде — маска немесе қашықтық қолданыңыз",
    icon: "shield",
    priority: 82,
    match: (c) => c.risk >= 7,
  },
  {
    id: "ventilate-early",
    textRu: "Проветрите до 7:00, потом закройте окна",
    textKk: "Таңертеңгі 7:00-ге дейін терезені ашып, сосын жабық ұстаңыз",
    icon: "wind",
    priority: 80,
    // Ventilation by hourly minimum: only suggest opening if some coming hour
    // drops into the low band — otherwise keep them shut.
    match: (c) => c.risk >= 4 && hourlyMin(c.hourly) <= 3,
  },
  {
    id: "pollen-avoid",
    textRu: "Пыльца активна — гуляйте подальше от цветущих",
    textKk: "Белсенді тозаң — гүлдеген өсімдіктерден алыс серуендеңіз",
    icon: "leaf",
    priority: 75,
    match: (c) => hasPollenTrigger(c.triggers) && maxPollen(c.pollen) >= 3,
  },
  {
    id: "indoor-sport",
    textRu: "Тренировку сегодня — в зал",
    textKk: "Бүгінгі жаттығуды — залда өткізіңіз",
    icon: "dumbbell",
    priority: 70,
    match: (c) => c.risk >= 6 || (hasPollenTrigger(c.triggers) && maxPollen(c.pollen) >= 4),
  },
  {
    id: "outdoor-after-rain",
    textRu: "После дождя воздух чище — можете гулять",
    textKk: "Жаңбырдан кейін ауа таза — серуендеуге болады",
    icon: "cloud-rain",
    priority: 62,
    match: (c) => c.weather.precipMm > 1 && c.risk <= 6,
  },
  {
    id: "diary-evening",
    textRu: "Вечером отметьте самочувствие — найдём ваш порог",
    textKk: "Кешке өзіңізді белгілеңіз — саған деген шегіңізді табамыз",
    icon: "heart-pulse",
    priority: 38,
    match: () => true,
  },
  {
    id: "calm-day",
    textRu: "День спокойный — можете гулять подольше",
    textKk: "Күн тыныш — ұзағырақ серуендеуге болады",
    icon: "sun",
    priority: 30,
    match: (c) => c.risk <= 3,
  },
];

/** Pick the top-3 matching actions by priority (stable on ties via rule order). */
export function pickActions(ctx: ActionContext): ActionEntry[] {
  const matched = RULES.filter((r) => r.match(ctx));
  // Stable sort by priority desc (preserves rule order for equal priorities).
  const ranked = matched
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.priority - a.r.priority || a.i - b.i)
    .map((x) => x.r);
  return ranked.slice(0, 3).map(({ id, textRu, textKk, icon, priority }) => ({
    id,
    textRu,
    textKk,
    icon,
    priority,
  }));
}

/** Map an action `icon` key to a lucide-react component name (used by the page). */
export const ACTION_ICON_KEYS = [
  "backpack",
  "home",
  "wind",
  "shield",
  "leaf",
  "dumbbell",
  "cloud-rain",
  "heart-pulse",
  "sun",
] as const;
