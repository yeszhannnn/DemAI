/**
 * TVEP risk model — the mathematical heart of DemAI (DESIGN §6).
 * Pure TypeScript, deterministic, zero network. No DOM, no fetch.
 *
 * risk = clamp(round(10 · multiplier · Σ w·f), 1, 10)
 *   fPm     ∈ 0..1  — PM2.5 dose via an explicit breakpoint table
 *   fPollen ∈ 0..1  — worst pollen trigger level / 5
 *   fWx     ∈ 0..1  — weather aggravators (stagnation / humidity / washout)
 */

export type PollenTrigger = "wormwood" | "birch" | "ragweed";
export type Trigger = "pm25" | "smoke" | PollenTrigger;
export type Diagnosis = "asthma" | "pollinosis" | "both" | "unknown";

export interface Profile {
  who: "self" | "parent";
  childAge?: number;
  diagnosis: Diagnosis;
  triggers: Trigger[];
  district: string;
  sensitive: boolean;
  /** Personal PM2.5 threshold (µg/m³) calibrated from the 7-day diary.
   *  Shifts the 0.45 midpoint of the breakpoint table (see fPm). */
  personalPm25?: number;
}

export interface Inputs {
  pm25: number;
  pollen: { wormwood: number; ragweed: number; birch: number };
  weather: { windMs: number; humidity: number; precipMm: number; tempC: number };
}

export interface BreakdownEntry {
  key: "pm" | "pollen" | "wx";
  labelRu: string;
  labelKk: string;
  pct: number;
}

export interface RiskResult {
  risk: number;
  breakdown: BreakdownEntry[];
}

export type RiskToken = "risk-low" | "risk-mid" | "risk-high" | "risk-severe";

export interface Verdict {
  textRu: string;
  textKk: string;
  chipRu: string;
  chipKk: string;
  chipToken: RiskToken;
  /** lucide-react icon name (DESIGN §3.4). */
  icon: string;
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * PM2.5 → 0..1 via explicit breakpoint table (µg/m³), linear within bands:
 *   0–12  → 0–0.15
 *   12–35 → 0.15–0.45
 *   35–55 → 0.45–0.7
 *   55–150→ 0.7–0.95
 *   >150  → 1
 *
 * personalPm25 shift: the 0.45 midpoint normally sits at x = 35 µg/m³.
 * A user with a lower personal threshold is more sensitive, so for the same
 * ambient pm25 their dose must rise. We achieve this by evaluating the table
 * at an effective concentration
 *     x = pm25 − (personalPm25 − 35)
 * i.e. translate the curve so that f = 0.45 now lands at x = personalPm25.
 * personalPm25 < 35 → x grows → higher score; > 35 → x shrinks → lower score.
 */
const PM_BANDS: ReadonlyArray<readonly [number, number]> = [
  [12, 0.15],
  [35, 0.45],
  [55, 0.7],
  [150, 0.95],
];

export function fPm(pm25: number, personalPm25?: number): number {
  let x = pm25;
  if (personalPm25 !== undefined && personalPm25 > 0) {
    x = pm25 - (personalPm25 - 35);
  }
  if (x <= 0) return 0;
  let prevX = 0;
  let prevY = 0;
  for (const [bx, by] of PM_BANDS) {
    if (x <= bx) {
      const t = (x - prevX) / (bx - prevX);
      return prevY + t * (by - prevY);
    }
    prevX = bx;
    prevY = by;
  }
  return 1;
}

/** Max level among the profile's pollen triggers / 5 (0 if none selected). */
export function fPollen(profile: Profile, inputs: Inputs): number {
  const pollenTriggers = profile.triggers.filter(
    (t): t is PollenTrigger =>
      t === "wormwood" || t === "birch" || t === "ragweed",
  );
  if (pollenTriggers.length === 0) return 0;
  let max = 0;
  for (const t of pollenTriggers) {
    if (inputs.pollen[t] > max) max = inputs.pollen[t];
  }
  return max / 5;
}

/** Weather aggravators → 0..1. */
export function fWx(w: Inputs["weather"]): number {
  let v = 0;
  if (w.windMs < 2) v += 0.5; // stagnation
  if (w.humidity > 75) v += 0.3; // humid air carries allergens
  if (w.precipMm > 1) v -= 0.4; // washout
  return clamp(v, 0, 1);
}

/** Sensitivity multiplier (DESIGN §6 step 5). */
export function multiplier(profile: Profile): number {
  switch (profile.diagnosis) {
    case "asthma":
      return 1.15;
    case "both":
      return 1.25;
    case "unknown":
      return 1.2;
    default: // pollinosis
      return profile.sensitive ? 1.2 : 1.0;
  }
}

export function computeRisk(profile: Profile, inputs: Inputs): RiskResult {
  const hasPollenTriggers = profile.triggers.some(
    (t) => t === "wormwood" || t === "birch" || t === "ragweed",
  );

  // Step 4 — weights; redistribute pollen weight to PM when the profile has
  // no pollen triggers.
  const wPm = hasPollenTriggers ? 0.5 : 0.85;
  const wPollen = hasPollenTriggers ? 0.35 : 0;
  const wWx = 0.15;

  const pm = fPm(inputs.pm25, profile.personalPm25);
  const pollen = fPollen(profile, inputs);
  const wx = fWx(inputs.weather);

  const contrib = {
    pm: wPm * pm,
    pollen: wPollen * pollen,
    wx: wWx * wx,
  };
  const sum = contrib.pm + contrib.pollen + contrib.wx;

  const m = multiplier(profile);
  const risk = clamp(Math.round(10 * m * sum), 1, 10);

  // Normalize pre-multiplier contributions to sum to 100 (feeds WhyCard).
  // When every factor is zero (perfectly clean day), split evenly so the
  // WhyCard still renders three segments summing to 100.
  const pctFor = (c: number): number =>
    sum > 0 ? (c / sum) * 100 : 100 / 3;

  const breakdown: BreakdownEntry[] = [
    { key: "pm", labelRu: "PM2.5", labelKk: "PM2.5", pct: pctFor(contrib.pm) },
    {
      key: "pollen",
      labelRu: "Пыльца",
      labelKk: "Тозаң",
      pct: pctFor(contrib.pollen),
    },
    {
      key: "wx",
      labelRu: "Погода",
      labelKk: "Ауа райы",
      pct: pctFor(contrib.wx),
    },
  ];

  return { risk, breakdown };
}

/** Verdict text, chip token and lucide icon per DESIGN §6 + §3.4. */
export function verdict(risk: number): Verdict {
  if (risk <= 3) {
    return {
      textRu: "Сегодня дышится легко",
      textKk: "Бүгін ауа тап-таза — еркін серуендеуге болады",
      chipRu: "Низкий риск",
      chipKk: "Төмен тәуекел",
      chipToken: "risk-low",
      icon: "thumbs-up",
    };
  }
  if (risk <= 6) {
    return {
      textRu: "Фон умеренный — слушай себя",
      textKk: "Ауа сапасы орташа — өзіңізді байқап жүріңіз",
      chipRu: "Средний риск",
      chipKk: "Орта тәуекел",
      chipToken: "risk-mid",
      icon: "minus-circle",
    };
  }
  if (risk <= 8) {
    return {
      textRu: "День непростой — лучше поберечься",
      textKk: "Ауа сапасы нашар — сақтанғаныңыз жөн",
      chipRu: "Высокий риск",
      chipKk: "Жоғары тәуекел",
      chipToken: "risk-high",
      icon: "alert-triangle",
    };
  }
  return {
    textRu: "Воздух тяжёлый — сегодня лучше остаться дома",
    textKk: "Ауа сапасы өте нашар — бүгін далаға шықпағаның дұрыс",
    chipRu: "Очень высокий",
    chipKk: "Өте жоғары",
    chipToken: "risk-severe",
    icon: "alert-triangle",
  };
}
