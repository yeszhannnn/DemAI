/**
 * lib/conditions.ts — the single source of truth for the diagnosis list
 * (DESIGN §5.4 S2, §5.6 settings). Both onboarding S2 and /settings render
 * THIS list and nothing else, so adding a condition later is one edit here.
 *
 * Each condition carries its own:
 *   - `id`           : stable slug persisted into `Profile.diagnosis` (string[])
 *   - `labelRu`/`labelKk` : the i18n labels (KK marked `// REVIEW: native speaker`
 *                     per the house style — see lib/kk.ts)
 *   - `autoTriggers` : the triggers «Выбрать за меня по диагнозу» preselects
 *                     (the union across all selected conditions is used)
 *   - `multiplier`   : the sensitivity multiplier this condition contributes;
 *                     `lib/risk.ts` takes the MAX across all selected
 *   - `sensitive?`   : when true, selecting this condition sets
 *                     `Profile.sensitive = true` (cautious thresholds, no
 *                     autoselect of triggers)
 *   - `icon`         : a lucide-react name key (mapped in the component, the
 *                     same convention as lib/actions.ts `icon`)
 *
 * Pure TypeScript, zero React imports, zero network — unit-safe.
 */

import type { Trigger } from "./risk";

export interface Condition {
  id: string;
  labelRu: string;
  /** Kazakh label — best-effort, every value marked for native-speaker review. */
  labelKk: string;
  autoTriggers: Trigger[];
  multiplier: number;
  sensitive?: boolean;
  /** lucide-react icon name key (mapped to a component in the UI layer). */
  icon: string;
}

export const CONDITIONS: readonly Condition[] = [
  {
    id: "asthma",
    labelRu: "Астма",
    labelKk: "Демікпе", // REVIEW: native speaker
    autoTriggers: ["pm25", "smoke"],
    multiplier: 1.15,
    icon: "wind",
  },
  {
    id: "pollinosis",
    labelRu: "Поллиноз (сенная лихорадка)",
    labelKk: "Поллиноз (шөптің безгегі)", // REVIEW: native speaker
    autoTriggers: ["wormwood", "birch", "ragweed"],
    multiplier: 1.0,
    icon: "sprout",
  },
  {
    id: "allergic_rhinitis",
    labelRu: "Аллергический ринит",
    labelKk: "Аллергиялық ринит", // REVIEW: native speaker
    autoTriggers: ["wormwood", "birch", "ragweed", "pm25"],
    multiplier: 1.15,
    icon: "sprout",
  },
  {
    id: "copd",
    labelRu: "ХОБЛ",
    labelKk: "СӨТБ", // REVIEW: native speaker
    autoTriggers: ["pm25", "smoke"],
    multiplier: 1.25,
    icon: "wind",
  },
  {
    id: "pollen_allergy",
    labelRu: "Аллергия на пыльцу",
    labelKk: "Тозаңға аллергия", // REVIEW: native speaker
    autoTriggers: ["wormwood", "birch", "ragweed"],
    multiplier: 1.0,
    icon: "leaf",
  },
  {
    id: "cardiovascular",
    labelRu: "Сердечно-сосудистое заболевание",
    labelKk: "Жүрек-тамыр ауруы", // REVIEW: native speaker
    autoTriggers: ["pm25"],
    multiplier: 1.15,
    icon: "heart-pulse",
  },
  {
    id: "pregnancy",
    labelRu: "Беременность",
    labelKk: "Жүктілік", // REVIEW: native speaker
    autoTriggers: ["pm25", "smoke"],
    multiplier: 1.15,
    icon: "baby",
  },
  {
    id: "sensitive_group",
    labelRu: "Ребёнок / пожилой (чувствительная группа)",
    labelKk: "Бала / қарт адам (сезімтал топ)", // REVIEW: native speaker
    autoTriggers: ["pm25", "wormwood"],
    multiplier: 1.2,
    icon: "baby",
  },
  {
    id: "other_unknown",
    labelRu: "Другое / не знаю",
    labelKk: "Басқа / білмеймін", // REVIEW: native speaker
    autoTriggers: [],
    multiplier: 1.2,
    sensitive: true,
    icon: "circle-help",
  },
];

/** Stable id list (handy for iteration / type-narrowing). */
export const CONDITION_IDS: readonly string[] = CONDITIONS.map((c) => c.id);

/** Look up a condition by id (undefined if unknown — callers guard). */
export function getCondition(id: string): Condition | undefined {
  for (const c of CONDITIONS) {
    if (c.id === id) return c;
  }
  return undefined;
}

/**
 * Union of `autoTriggers` across all selected condition ids, preserving the
 * canonical Trigger order (pm25, smoke, then pollen). Dedupes via a Set.
 * Empty for an empty selection (or only `other_unknown`, which has none).
 */
export function autoTriggersFor(diagnoses: string[]): Trigger[] {
  const set = new Set<Trigger>();
  for (const id of diagnoses) {
    const c = getCondition(id);
    if (!c) continue;
    for (const t of c.autoTriggers) set.add(t);
  }
  // Stable order: air triggers first, then pollen — matches the S3 group order.
  const order: Trigger[] = ["pm25", "smoke", "wormwood", "birch", "ragweed"];
  return order.filter((t) => set.has(t));
}

/**
 * Max multiplier across all selected conditions (1.0 if none selected or none
 * recognised). This is the sensitivity multiplier `lib/risk.ts` applies —
 * a user with both asthma (1.15) and pollinosis (1.0) gets 1.15, not a stack.
 */
export function maxMultiplier(diagnoses: string[]): number {
  let m = 1.0;
  for (const id of diagnoses) {
    const c = getCondition(id);
    if (c && c.multiplier > m) m = c.multiplier;
  }
  return m;
}

/**
 * True if any selected condition is the "sensitive" kind (today only
 * `other_unknown`): cautious thresholds, no autoselect of triggers.
 * `Profile.sensitive` is derived from this on every save.
 */
export function anySensitive(diagnoses: string[]): boolean {
  for (const id of diagnoses) {
    const c = getCondition(id);
    if (c && c.sensitive) return true;
  }
  return false;
}
