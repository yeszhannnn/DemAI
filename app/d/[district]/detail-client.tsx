"use client";

/**
 * DetailClient — the thin client bridge for the Detail screen (DESIGN §5.1).
 *
 * Reads the anonymous profile from localStorage (useProfile), fetches
 * `/api/risk?district=<slug>&demo=<d>&p=<base64 profile>`, and renders the
 * nine sections in order with skeletons (§7) + entrance motion (fade + 8px up,
 * 60ms stagger). The hero/AccentBlock tap scrolls to WhyCard.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Backpack,
  Bell,
  CloudRain,
  Dumbbell,
  HeartPulse,
  Home,
  Info,
  Leaf,
  MinusCircle,
  Shield,
  Sun,
  ThumbsUp,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { VerdictChip } from "@/components/ui/VerdictChip";
import { MetricCard } from "@/components/ui/MetricCard";
import { ForecastBars, type ForecastBar } from "@/components/ui/ForecastBars";
import { TopoTexture, buildTopoRings } from "@/components/ui/TopoTexture";
import { useProfile, resetMeSync, syncMe } from "@/lib/useProfile";
import { t as tStatic, useLocale, useT, type Locale } from "@/lib/i18n";
import { getDistrict } from "@/data/districts";
import { pickActions, type ActionContext, type ActionEntry } from "@/lib/actions";
import type { RiskResponse } from "@/lib/compose";
import type { Profile } from "@/lib/risk";
import { DiarySheet, type DiaryStatus } from "./DiarySheet";

const WEEKDAY_SHORT_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** lucide name → component, for the action rule table (lib/actions.ts). */
const ACTION_ICONS: Record<string, LucideIcon> = {
  backpack: Backpack,
  home: Home,
  wind: Wind,
  shield: Shield,
  leaf: Leaf,
  dumbbell: Dumbbell,
  "cloud-rain": CloudRain,
  "heart-pulse": HeartPulse,
  sun: Sun,
};

/** Verdict icon by lucide name (lib/risk.ts `verdict().icon`). */
const VERDICT_ICONS: Record<string, LucideIcon> = {
  "thumbs-up": ThumbsUp,
  "minus-circle": MinusCircle,
  "alert-triangle": AlertTriangle,
};

function nowHourLabel(): string {
  const d = new Date();
  const wd = WEEKDAY_SHORT_RU[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  return `${wd} ${hh}:00`;
}

/**
 * Frozen "now" label for DEMO mode: one hour before the snapshot's first
 * forecast hour (compose.ts builds `hourly` starting at the *next* hour).
 * Pure function of the snapshot label — no `new Date()` — so the demo
 * forecast curve stays byte-identical today, tomorrow, offline (DESIGN §7).
 */
function prevHourLabel(label: string): string {
  const m = label.match(/^(\S+)\s+(\d{2}):00$/);
  if (!m) return label;
  const wdIdx = WEEKDAY_SHORT_RU.indexOf(m[1]);
  if (wdIdx === -1) return label;
  const hh = parseInt(m[2], 10);
  const nh = (hh - 1 + 24) % 24;
  const nd = nh === 23 ? (wdIdx - 1 + 7) % 7 : wdIdx;
  return `${WEEKDAY_SHORT_RU[nd]} ${String(nh).padStart(2, "0")}:00`;
}

/** Split "сб 15:00" → { day: "сб", hour: "15:00" } for ForecastBars. */
function splitLabel(label: string): { day?: string; hour: string } {
  const idx = label.indexOf(" ");
  if (idx === -1) return { hour: label };
  return { day: label.slice(0, idx), hour: label.slice(idx + 1) };
}

function pollenLevelWord(level: number, locale: Locale): string {
  if (level <= 0) return tStatic("level.none", locale);
  if (level <= 2) return tStatic("level.low", locale);
  if (level <= 4) return tStatic("level.moderate", locale);
  return tStatic("level.high", locale);
}

interface DetailClientProps {
  district: string;
  demo: boolean;
}

export function DetailClient({ district, demo }: DetailClientProps) {
  const router = useRouter();
  const { anonId, profile, diaryCount, todayMarked, saveProfile, setDiaryCount, setTodayMarked } =
    useProfile();
  const tt = useT();
  const [locale] = useLocale();
  const [data, setData] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const whyRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef<RiskResponse | null>(null);
  dataRef.current = data;

  // Fetch /api/risk (demo → snapshot, zero external network). The effect re-runs
  // when the profile changes (e.g. after a diary write flips personalPm25),
  // but we must NOT flash the skeleton on a re-fetch — that reads as a page
  // reload. The skeleton is only for the very first load; on a profile/district
  // change we keep the previous data on screen and swap silently when the new
  // response arrives (no reload — PROMPTS §11.5).
  useEffect(() => {
    let cancelled = false;
    if (!dataRef.current) setLoading(true);
    setStale(false);
    const p = profile ? btoa(JSON.stringify(profile)) : "";
    const url = `/api/risk?district=${encodeURIComponent(district)}${
      demo ? "&demo=1" : ""
    }${p ? `&p=${encodeURIComponent(p)}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: RiskResponse) => {
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      })
      .catch(() => {
        // Friendly RU error boundary (Prompt 12.2): instead of crashing, fall
        // back to the committed demo snapshot and surface a one-line «Данные
        // задерживаются — показываем последний снимок» note. The screen never
        // blanks — the demo snapshot is the last-resort truth.
        if (cancelled) return;
        fetch(`/api/risk?district=${encodeURIComponent(district)}&demo=1`)
          .then((r) => r.json())
          .then((j: RiskResponse) => {
            if (!cancelled) {
              setData(j);
              setStale(true);
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setLoading(false);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [district, demo, profile]);

  const actions = useMemo<ActionEntry[]>(() => {
    if (!data) return [];
    const ctx: ActionContext = {
      risk: data.risk,
      diagnosis: profile?.diagnosis ?? "pollinosis",
      triggers: profile?.triggers ?? ["wormwood", "birch", "ragweed"],
      pollen: data.pollen,
      weather: data.weather,
      hourly: data.hourly,
    };
    return pickActions(ctx);
  }, [data, profile]);

  const bars = useMemo<ForecastBar[]>(() => {
    if (!data) return [];
    // DEMO: derive the "now" label from the frozen snapshot so the curve is
    // byte-identical across days. LIVE: use the real current hour (date-dependent).
    const nowLabel = demo && data.hourly.length
      ? prevHourLabel(data.hourly[0].hourLabel)
      : nowHourLabel();
    const now: ForecastBar = { ...splitLabel(nowLabel), risk: data.risk };
    const rest: ForecastBar[] = data.hourly.map((h) => ({
      ...splitLabel(h.hourLabel),
      risk: h.risk,
    }));
    return [now, ...rest];
  }, [data, demo]);

  const districtName = useMemo(() => {
    const d = getDistrict(district);
    return d ? (locale === "kk" ? d.nameKk : d.nameRu) : district;
  }, [district, locale]);
  const verdictIcon = data ? VERDICT_ICONS[data.verdict.icon] ?? AlertTriangle : AlertTriangle;

  function scrollToWhy() {
    whyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Screen fill={false}>
      <div className="flex flex-col gap-4 pt-6">
        {/* 1. TopBar (detail) */}
        <section data-testid="section-topbar">
          <TopBar
            variant="detail"
            title={districtName}
            subtitle={tt("app.city")}
            onHome={() => router.push("/home")}
            iconClassName="tap"
          />
        </section>

        {/* Friendly RU error-boundary note — shown only when the live fetch
            failed and we fell back to the committed demo snapshot (Prompt 12.2).
            Not one of the 9 sections; a status line above the hero. */}
        {stale && data ? <StaleNote text={tt("detail.stale")} /> : null}

        {loading || !data ? (
          <DetailSkeleton />
        ) : (
          <>
            {/* 2. Hero */}
            <Reveal>
              <Hero
                risk={data.risk}
                verdictText={locale === "kk" ? data.verdict.textKk : data.verdict.textRu}
                verdictIcon={verdictIcon}
                onTapWhy={scrollToWhy}
                tt={tt}
              />
            </Reveal>

            {/* 3. ActionsCard */}
            <Reveal delay={60}>
              <ActionsCard actions={actions} locale={locale} tt={tt} />
            </Reveal>

            {/* 4. Pollen row */}
            <Reveal delay={120}>
              <MetricRow
                subtitle={tt("detail.pollenSubtitle")}
                testId="section-pollen"
              >
              <MetricCard
                name={tt("onb.trigger.wormwood")}
                value={data.pollen.wormwood}
                mode="word"
                levelWord={pollenLevelWord(data.pollen.wormwood, locale)}
                className="tap"
              />
              <MetricCard
                name={tt("onb.trigger.ragweed")}
                value={data.pollen.ragweed}
                mode="word"
                levelWord={pollenLevelWord(data.pollen.ragweed, locale)}
                className="tap"
              />
              <MetricCard
                name={tt("onb.trigger.birch")}
                value={data.pollen.birch}
                mode="word"
                levelWord={pollenLevelWord(data.pollen.birch, locale)}
                className="tap"
              />
              </MetricRow>
            </Reveal>

            {/* 5. Air row */}
            <Reveal delay={180}>
              <MetricRow subtitle={tt("detail.airSubtitle")} testId="section-air">
              <MetricCard
                name="PM2.5"
                value={data.pm25.ug}
                mode="unit"
                unit={tt("unit.pm")}
                className="tap"
              />
              <MetricCard
                name="PM10"
                value={data.pm10?.ug ?? 0}
                mode="unit"
                unit={tt("unit.pm")}
                className="tap"
              />
              </MetricRow>
            </Reveal>

            {/* 6. ForecastBars */}
            <Reveal data-testid="section-forecast" delay={240}>
              <ForecastBars
                bars={bars}
                selectedIndex={0}
                title={tt("detail.forecast")}
                className="tap-static shadow-soft"
              />
            </Reveal>

            {/* 7. WhyCard */}
            <Reveal innerRef={whyRef} data-testid="section-why" delay={300}>
              <WhyCard
                risk={data.risk}
                breakdown={data.breakdown}
                locale={locale}
                tt={tt}
                personalPm25={profile?.personalPm25}
                diaryCount={diaryCount}
              />
            </Reveal>

            {/* 8. BotBanner + push preview */}
            <Reveal data-testid="section-bot" delay={360}>
              <BotBanner
                districtName={districtName}
                data={data}
                actions={actions}
                locale={locale}
                tt={tt}
                anonId={anonId}
                profile={profile}
                lang={locale}
                todayMarked={todayMarked}
                onDiaryWritten={(personalPm25, count) => {
                  setDiaryCount(count);
                  setTodayMarked(true);
                  if (profile) {
                    const next: Profile =
                      personalPm25 === null
                        ? (() => {
                            const { personalPm25: _drop, ...rest } = profile;
                            return rest;
                          })()
                        : { ...profile, personalPm25 };
                    saveProfile(next);
                  }
                  // Trigger the /api/me refetch so personalPm25/diaryCount are
                  // re-confirmed from the server without a reload (§11.5).
                  resetMeSync();
                  void syncMe(anonId);
                }}
              />
            </Reveal>

            {/* 9. Disclaimer (always visible, including sparse + demo) */}
            <p
              data-testid="section-disclaimer"
              className="text-center text-caption pt-2"
              style={{ color: "var(--ink-40)" }}
            >
              {tt("detail.disclaimer")}
            </p>
          </>
        )}
      </div>
    </Screen>
  );
}

// --- helpers ---------------------------------------------------------------

// (helpers inlined above; component subcomponents live below)

type TFunc = ReturnType<typeof useT>;

/** StaleNote — the friendly RU error-boundary line (Prompt 12.2). A small
 *  caption row with an info icon; ink-60 text. Not a Detail section. */
function StaleNote({ text }: { text: string }) {
  return (
    <div
      data-testid="stale-banner"
      className="flex items-center gap-2 px-1 text-caption"
      style={{ color: "var(--ink-60)" }}
      role="status"
    >
      <Info size={14} strokeWidth={2} className="shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/** Entrance motion: fade + 8px up, 240ms, with a per-section stagger delay. */
export function Reveal({
  children,
  delay = 0,
  innerRef,
  ...rest
}: {
  children: React.ReactNode;
  delay?: number;
  innerRef?: React.Ref<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (typeof innerRef === "function") innerRef(node);
        else if (innerRef) (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      {...rest}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 240ms ease-out ${delay}ms, transform 240ms ease-out ${delay}ms`,
        ...rest.style,
      }}
    >
      {children}
    </div>
  );
}

/** Hero — DESIGN §5.1 item 2. The blob is an organic SVG shape CLIPPED by the
 * screen's left edge: its center sits off-screen at (−15% width, 55% of 230),
 * only the right lobe is visible (reaching ~62% of width). The right silhouette
 * is a wavy arc (radius modulated ±4% by sin(3θ+1.2), 64 samples). TopoTexture
 * contours share the SAME off-screen focus, so they radiate from the blob's
 * origin. The row bleeds past the Screen's 20px left padding to x=0 (no light
 * gap). The number group sits at the optical center of the visible lobe
 * (~28% width). Blob tap scrolls to WhyCard. */
const HERO_H = 230;
const BLOB_SAMPLES = 64;
const BLOB_AMP = 0.06; // ±6% silhouette modulation

/** True-circle blob path: a single radius R centered off-screen left, modulated
 * ±amp by sin(3θ + 1.2), 64 samples. Equal radii (no y-scale) keeps the visible
 * lobe a fat round bulge instead of a pointed leaf. cx = −8% width keeps the
 * center close enough that the lobe is wide and round; R = 0.53·w lands the
 * rightmost point at ~45% of width. */
function buildBlobPath(w: number, R: number, amp: number): string {
  const cx = -0.08 * w; // off-screen left, close to the edge
  const cy = 0.5 * HERO_H; // 115, vertically centered
  let d = "";
  for (let k = 0; k < BLOB_SAMPLES; k++) {
    const theta = (k / BLOB_SAMPLES) * Math.PI * 2;
    const r = R * (1 + amp * Math.sin(3 * theta + 1.2));
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += (k === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d + "Z";
}

export function Hero({
  risk,
  verdictText,
  verdictIcon: VerdictIcon,
  onTapWhy,
  tt,
}: {
  risk: number;
  verdictText: string;
  verdictIcon: LucideIcon;
  onTapWhy: () => void;
  tt: TFunc;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [w, setW] = useState(410);

  useEffect(() => {
    const el = btnRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(320, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { blobPath, topoRings } = useMemo(() => {
    const cx = -0.08 * w;
    const cy = 0.5 * HERO_H;
    const R = 0.53 * w; // cx + R = 0.45w → rightmost at 45% of width
    return {
      blobPath: buildBlobPath(w, R, BLOB_AMP),
      // Dense contours (step ~14px) radiating from the blob's off-screen center.
      topoRings: buildTopoRings({
        focus: { x: cx, y: cy },
        rings: 26,
        seed: 1,
        base: (i) => i * 14,
      }),
    };
  }, [w]);

  return (
    <section data-testid="section-hero" className="flex flex-col">
      <button
        ref={btnRef}
        type="button"
        onClick={onTapWhy}
        aria-label={`${tt("detail.why", { risk })}`}
        className="tap relative block text-left"
        style={{
          height: HERO_H,
          border: "none",
          padding: 0,
          background: "transparent",
          marginLeft: -20,
          width: "calc(100% + 20px)",
        }}
      >
        {/* Blob + topo contours, sharing the off-screen center. The viewBox
            matches measured pixels so the shape is a true circle (no stretch). */}
        <svg
          viewBox={`0 0 ${w} ${HERO_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <clipPath id="heroBlobClip">
              <path d={blobPath} />
            </clipPath>
          </defs>
          <path d={blobPath} fill="var(--lime)" />
          <g
            clipPath="url(#heroBlobClip)"
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={0.13}
            strokeWidth={1}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {topoRings.map((d, i) => (
              <path key={i} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        </svg>

        {/* Number group at the optical center of the visible lobe (~21% width),
            vertically centered */}
        <div
          className="absolute"
          style={{ left: "21%", top: "50%", transform: "translate(-50%, -50%)" }}
        >
          <span className="inline-flex items-start gap-1">
            <span className="text-num-hero text-ink leading-none">{risk}</span>
            <span className="text-unit text-ink leading-none">
              {tt("unit.risk")}
            </span>
          </span>
        </div>

        {/* Verdict icon + 2-line body/ink text to the right of the blob,
            vertically centered against it */}
        <div
          className="absolute flex items-center gap-2"
          style={{ left: "50%", right: 0, top: "50%", transform: "translateY(-50%)" }}
        >
          <span
            className="inline-flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "var(--icon-bg)", color: "var(--ink)" }}
          >
            <VerdictIcon size={20} strokeWidth={2} />
          </span>
          <p className="text-body text-ink leading-[22px]">
            {verdictText}
          </p>
        </div>
      </button>

      {/* VerdictChip below the blob */}
      <div className="mt-3">
        <VerdictChip risk={risk} />
      </div>
    </section>
  );
}

/** ActionsCard — DESIGN §5.1.3. White card, h2 title «3 действия на завтра»,
 * three rows: 40px --icon-bg circle + reminder text. Reminder wording only (§8). */
export function ActionsCard({
  actions,
  locale,
  tt,
}: {
  actions: ActionEntry[];
  locale: Locale;
  tt: TFunc;
}) {
  return (
    <section
      data-testid="section-actions"
      className="tap-static bg-white shadow-soft"
      style={{ borderRadius: "var(--r-card)", padding: 20 }}
    >
      <h2 className="text-h2 text-ink">{tt("detail.actionsTitle")}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {actions.map((a) => {
          const Icon = ACTION_ICONS[a.icon] ?? Wind;
          return (
            <div key={a.id} className="flex items-center gap-3">
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: "var(--icon-bg)", color: "var(--ink)" }}
              >
                <Icon size={20} strokeWidth={2} />
              </span>
              <p className="text-body text-ink leading-[22px]">
                {locale === "kk" ? a.textKk : a.textRu}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** MetricRow — subtitle + horizontally-scrolling MetricCards (rightmost cropped). */
export function MetricRow({
  subtitle,
  testId,
  children,
}: {
  subtitle: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-2">
      <div className="text-caption" style={{ color: "var(--ink-60)" }}>
        {subtitle}
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Segment color per DESIGN §5.1: PM2.5 → --risk-mid, Пыльца → --lime,
 * Погода → rgba(255,255,255,.35). */
function breakdownColor(key: "pm" | "pollen" | "wx"): string {
  if (key === "pm") return "var(--risk-mid)";
  if (key === "pollen") return "var(--lime)";
  return "rgba(255,255,255,.35)";
}

/** WhyCard — DESIGN §5.1.7. Slate card, stacked h-12 --r-full bar from
 * breakdown pct + legend rows with percentages. When `personalPm25` is set,
 * appends a `caption/white-70` line «Личный порог: … — найден по твоему
 * дневнику за N дней» (PROMPTS §11.4) — still inside section 7, no new section. */
export function WhyCard({
  risk,
  breakdown,
  locale,
  tt,
  personalPm25,
  diaryCount,
}: {
  risk: number;
  breakdown: { key: "pm" | "pollen" | "wx"; labelRu: string; labelKk: string; pct: number }[];
  locale: Locale;
  tt: TFunc;
  personalPm25?: number;
  diaryCount?: number;
}) {
  return (
    <section
      className="tap-static shadow-soft flex flex-col"
      style={{ background: "var(--slate)", borderRadius: "var(--r-card)", padding: 20 }}
    >
      <h2 className="text-h2 text-white">{tt("detail.why", { risk })}</h2>

      {/* Stacked bar h=12, --r-full */}
      <div
        className="mt-4 flex w-full overflow-hidden"
        style={{ height: 12, borderRadius: "var(--r-full)" }}
      >
        {breakdown.map((b) => (
          <div
            key={b.key}
            style={{ width: `${b.pct}%`, background: breakdownColor(b.key) }}
          />
        ))}
      </div>

      {/* Legend rows with percentages */}
      <div className="mt-4 flex flex-col gap-2">
        {breakdown.map((b) => (
          <div
            key={b.key}
            className="flex items-center justify-between text-caption"
            style={{ color: "var(--white-70)" }}
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "var(--r-full)",
                  background: breakdownColor(b.key),
                }}
              />
              {locale === "kk" ? b.labelKk : b.labelRu}
            </span>
            <span>{Math.round(b.pct)}%</span>
          </div>
        ))}
      </div>

      {/* Personal threshold line — only when the loop has closed (§11.4).
          No new section: appended inside the existing WhyCard. */}
      {typeof personalPm25 === "number" && personalPm25 > 0 ? (
        <p
          data-testid="section-why-threshold"
          className="mt-4 text-caption"
          style={{ color: "var(--white-70)" }}
        >
          {tt("detail.personalThreshold", {
            pm: personalPm25,
            n: diaryCount ?? 0,
          })}
        </p>
      ) : null}
    </section>
  );
}

/** BotBanner + push-preview card — DESIGN §5.1.8. Lime block (bell + connect)
 * in AccentBlock language, then a white "message" card with tomorrow-07:30
 * notification text composed from the data (mock send).
 *
 * Connect: POST /api/link with the anonymous profile snapshot (so the bot's
 * /start handler can compose the risk for this user), THEN open the Telegram
 * deep link `t.me/<NEXT_PUBLIC_TG_BOT>?start=<anonId>`. The upsert must
 * succeed before the deep link opens, otherwise /start has no profile. */
export function BotBanner({
  districtName,
  data,
  actions,
  locale,
  tt,
  anonId,
  profile,
  lang,
  todayMarked,
  onDiaryWritten,
}: {
  districtName: string;
  data: RiskResponse;
  actions: ActionEntry[];
  locale: Locale;
  tt: TFunc;
  anonId: string;
  profile: Profile | null;
  lang: Locale;
  todayMarked: boolean;
  onDiaryWritten?: (personalPm25: number | null, diaryCount: number) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryStatus, setDiaryStatus] = useState<DiaryStatus>("idle");
  const [diaryCount, setDiaryCount] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoWrapRef = useRef<HTMLDivElement | null>(null);

  // Loud-connect diagnostics (Prompt: make Подключить failures visible).
  // botError: red inline banner text (null = no banner). lastApiStatus feeds
  // the dev/?debug=1 line so we can eyeball the resolved bot username + API
  // result on prod without devtools.
  const [botError, setBotError] = useState<string | null>(null);
  const [lastApiStatus, setLastApiStatus] = useState<number | "network" | null>(null);
  const [resolvedBot, setResolvedBot] = useState<string>("");
  const showDebug = useMemo(() => {
    if (process.env.NODE_ENV !== "production") return true;
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("debug") === "1";
    } catch {
      return false;
    }
  }, []);

  // Close the info popover on an outside tap / Escape. The popover lives above
  // the capsule; tapping anywhere else dismisses it.
  useEffect(() => {
    if (!infoOpen) return;
    function onDown(e: MouseEvent | TouchEvent): void {
      const el = infoWrapRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setInfoOpen(false);
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setInfoOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [infoOpen]);

  async function onConnect(): Promise<void> {
    if (connecting) return;
    // Reset any previous error/popup state on each tap.
    setBotError(null);
    if (!anonId || !profile) {
      console.error("[DemAI] onConnect: missing anonId or profile — cannot connect", {
        anonId,
        profile,
      });
      setBotError(tt("detail.botUnavailable"));
      return;
    }
    const bot = process.env.NEXT_PUBLIC_TG_BOT ?? "";
    setResolvedBot(bot);
    if (!bot) {
      console.error(
        "[DemAI] onConnect: NEXT_PUBLIC_TG_BOT is falsy/undefined — refusing to open Telegram",
      );
      setBotError(tt("detail.botUnavailable"));
      return;
    }
    // Reserve the popup slot SYNCHRONOUSLY within the trusted click gesture,
    // BEFORE any await. window.open('', '_blank') is the call that needs the
    // user gesture; navigating the already-open handle later does not. If
    // this returns null the browser already blocked us — bail before the
    // fetch and tell the user to allow popups.
    const win = window.open("", "_blank");
    if (win === null) {
      console.error(
        "[DemAI] onConnect: window.open('') returned null — popup blocked before fetch",
      );
      setBotError(tt("detail.botPopupBlocked"));
      return;
    }
    const url = `https://t.me/${bot}?start=${encodeURIComponent(anonId)}`;
    // Log the EXACT deep-link URL before navigating, so we can see whether
    // NEXT_PUBLIC_TG_BOT resolved to a real username or literally "undefined".
    console.log("[DemAI] onConnect: deep-link URL reserved for navigation", url, {
      bot,
      anonId,
      lang,
    });
    setConnecting(true);
    try {
      const r = await fetch("/api/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonId, profile, lang }),
      });
      const bodyText = await r.text();
      console.log("[DemAI] POST /api/link status", r.status, "body", bodyText);
      setLastApiStatus(r.status);
      if (!r.ok) {
        console.error("[DemAI] POST /api/link not ok", r.status, bodyText);
        setBotError(tt("detail.botLinkFailed", { status: r.status }));
        // Close the blank tab we reserved — don't leave it stuck blank.
        try {
          win.close();
        } catch {
          /* ignore — cross-tab close can throw in some browsers */
        }
        return;
      }
      // Success: navigate the already-open tab to the Telegram deep link.
      // This works even though time has passed, because the window handle
      // itself is what needed the gesture, not the navigation.
      win.location.href = url;
    } catch (err) {
      console.error("[DemAI] POST /api/link threw", err);
      setLastApiStatus("network");
      setBotError(tt("detail.botLinkFailed", { status: "network" }));
      try {
        win.close();
      } catch {
        /* ignore */
      }
      return;
    } finally {
      setConnecting(false);
    }
  }

  /** In-app diary fallback (PROMPTS §11.5): the capsule opens a bottom sheet
   *  with the same three buttons as the Telegram evening question → POST
   *  /api/diary (same table, same recompute). The client sends the risk + pm25
   *  it currently shows (the "what was shown" truth); the server upserts
   *  today's row (one entry per day — repeat taps overwrite) and recomputes the
   *  personal PM2.5 threshold. On success the sheet swaps to a confirmation
   *  («Записано ✓» / «Обновлено ✓» + «N/7 дней до личного порога») and holds
   *  that confirmation for 1400ms BEFORE sliding the sheet down — so the user
   *  sees the checkmark inside the sheet, not a silent close. On error it
   *  shows a loud error and stays open. No page reload anywhere. */
  async function onDiary(feeling: 1 | 2 | 3): Promise<void> {
    if (diaryStatus === "saving" || !anonId || !profile) return;
    setDiaryStatus("saving");
    try {
      const r = await fetch("/api/diary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anonId,
          feeling,
          riskShown: data.risk,
          pm25: data.pm25.ug,
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`POST /api/diary ${r.status}: ${errText}`);
      }
      const j = (await r.json()) as {
        personalPm25: number | null;
        diaryCount: number;
        updated: boolean;
      };
      setDiaryCount(j.diaryCount);
      onDiaryWritten?.(j.personalPm25, j.diaryCount);
      setDiaryStatus(j.updated ? "updated" : "saved");
      // Hold the confirmation state inside the sheet for 1400ms, THEN slide
      // the sheet down (260ms transition). No reload — the page stays put.
      setTimeout(() => {
        setDiaryOpen(false);
        setTimeout(() => setDiaryStatus("idle"), 260);
      }, 1400);
    } catch (err) {
      console.error("[DemAI] diary write failed:", err);
      setDiaryStatus("error");
    }
  }

  function openDiary(): void {
    setDiaryStatus("idle");
    setDiaryOpen(true);
  }

  function closeDiary(): void {
    if (diaryStatus === "saving") return;
    setDiaryOpen(false);
    setTimeout(() => setDiaryStatus("idle"), 260);
  }

  const chipLabel = locale === "kk" ? data.verdict.chipKk : data.verdict.chipRu;
  const firstAction = actions[0];
  const firstActionText = firstAction
    ? locale === "kk"
      ? firstAction.textKk
      : firstAction.textRu
    : "";
  const pushText =
    locale === "kk"
      ? `Ертең ${districtName} ауданында: тәуекел ${data.risk}/10, ${chipLabel}. Тозаң ${data.pollen.wormwood}/5. ${firstActionText}`
      : `Завтра в ${districtName}: риск ${data.risk}/10, ${chipLabel}. Полынь ${data.pollen.wormwood}/5. ${firstActionText}`;

  return (
    <section className="flex flex-col gap-3">
      {/* Lime block (AccentBlock language) */}
      <div
        className="relative overflow-hidden"
        style={{ background: "var(--lime)", borderRadius: "var(--r-inner)", padding: "16px 20px" }}
      >
        <TopoTexture tone="ink" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: "var(--ink)", color: "var(--white)" }}
            >
              <Bell size={20} strokeWidth={2} />
            </span>
            <p className="text-body text-ink leading-[22px] line-clamp-2">
              {tt("detail.botText")}
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting || !anonId || !profile}
            className="tap shrink-0 rounded-full text-chip text-white disabled:opacity-50"
            style={{ background: "var(--ink)", height: 48, padding: "0 20px", border: "none" }}
          >
            {tt("detail.botConnect")}
          </button>
        </div>

        {/* Dev-only / ?debug=1 live diagnostics: resolved bot username +
            last /api/link status, so we can eyeball it on prod without
            opening devtools. Hidden in production unless ?debug=1. */}
        {showDebug ? (
          <p
            data-testid="bot-debug-line"
            className="relative mt-3 text-caption"
            style={{ color: "var(--ink)" }}
          >
            {tt("detail.botDebug", {
              bot: resolvedBot || "—",
              status: lastApiStatus === null ? "—" : String(lastApiStatus),
            })}
          </p>
        ) : null}
      </div>

      {/* Inline error banner — shown only when onConnect hit a hard failure
          (missing bot username, /api/link not ok / threw, or popup blocked).
          Red background, white text, role="alert" so it's announced. */}
      {botError ? (
        <div
          data-testid="bot-error-banner"
          role="alert"
          className="flex items-start gap-2 rounded-[var(--r-inner)] px-3 py-2 text-caption"
          style={{ background: "#d92d20", color: "#fff" }}
        >
          <AlertTriangle size={14} strokeWidth={2} className="mt-[1px] shrink-0" />
          <span>{botError}</span>
        </div>
      ) : null}

      {/* Push preview "message" card */}
      <div
        data-testid="section-bot-push"
        className="bg-white shadow-soft"
        style={{ borderRadius: "var(--r-inner)", padding: 16 }}
      >
        <div
          className="flex items-center gap-2 text-caption"
          style={{ color: "var(--ink-60)" }}
        >
          <Bell size={14} strokeWidth={2} />
          <span>DemAI · 07:30</span>
        </div>
        <p className="mt-2 text-body text-ink leading-[22px]">{pushText}</p>
      </div>

      {/* In-app diary fallback (§11.5): a visible capsule button inside the
          existing BotBanner section — SecondaryButton language (white pill,
          ink text, --shadow-soft), full-width below the push preview. No new
          section, no new page. Opens the DiarySheet bottom sheet. The ⓘ at the
          right end of the label opens an explanatory popover (closes on outside
          tap). Under the capsule, a persistent «Сегодня: отмечено ✓» caption
          appears once today's row exists — lasting evidence the write worked. */}
      <div className="flex flex-col gap-2">
        <div ref={infoWrapRef} className="relative">
          <button
            type="button"
            onClick={openDiary}
            disabled={!anonId || !profile}
            className="tappable flex w-full items-center justify-center gap-2 rounded-full bg-white text-chip text-ink shadow-soft disabled:opacity-50"
            style={{ height: 48, border: "none", padding: "0 16px", fontWeight: 600 }}
          >
            <span>{tt("detail.diaryLink")}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label="info"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setInfoOpen((v) => !v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  setInfoOpen((v) => !v);
                }
              }}
              className="tappable inline-flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 24, height: 24, color: "var(--ink-40)" }}
            >
              <Info size={16} strokeWidth={2} />
            </span>
          </button>

          {infoOpen ? (
            <div
              role="dialog"
              aria-label={tt("detail.diaryLink")}
              data-testid="diary-info-popover"
              className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 bg-white shadow-soft"
              style={{
                borderRadius: "var(--r-inner)",
                padding: 16,
                maxWidth: 300,
                width: "max-content",
              }}
            >
              <p className="text-body text-ink" style={{ lineHeight: "22px" }}>
                {tt("detail.diaryInfo")}
              </p>
            </div>
          ) : null}
        </div>

        {todayMarked ? (
          <p
            data-testid="diary-today-caption"
            className="text-center text-caption"
            style={{ color: "var(--ink-60)" }}
          >
            {tt("detail.diaryToday")}
          </p>
        ) : null}
      </div>

      <DiarySheet
        open={diaryOpen}
        status={diaryStatus}
        diaryCount={diaryCount}
        tt={tt}
        onClose={closeDiary}
        onPick={onDiary}
      />
    </section>
  );
}

/** DetailSkeleton — DESIGN §7. --r-inner blocks pulsing --lime 12% ↔ 24%. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="section-skeleton">
      <SkeletonBlock height={210} radius="42% 58% 56% 44% / 50% 48% 52% 50%" width="55%" />
      <SkeletonBlock height={48} width={160} />
      <SkeletonBlock height={180} />
      <SkeletonBlock height={120} />
      <SkeletonBlock height={180} />
    </div>
  );
}

function SkeletonBlock({
  height,
  width = "100%",
  radius = "var(--r-inner)",
}: {
  height: number;
  width?: string | number;
  radius?: string;
}) {
  return (
    <div
      className="animate-pulse"
      style={{
        height,
        width,
        borderRadius: radius,
        background: "var(--lime)",
        opacity: 0.18,
      }}
    />
  );
}
