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
import { TopoTexture } from "@/components/ui/TopoTexture";
import { useProfile } from "@/lib/useProfile";
import { t as tStatic, useLocale, useT, type Locale } from "@/lib/i18n";
import { getDistrict } from "@/data/districts";
import { pickActions, type ActionContext, type ActionEntry } from "@/lib/actions";
import type { RiskResponse } from "@/lib/compose";

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
  const { profile } = useProfile();
  const tt = useT();
  const [locale] = useLocale();
  const [data, setData] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const whyRef = useRef<HTMLDivElement | null>(null);

  // Fetch /api/risk (demo → snapshot, zero external network).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
        // Fallback: try the demo snapshot so the screen never crashes.
        if (!cancelled) {
          fetch(`/api/risk?district=${encodeURIComponent(district)}&demo=1`)
            .then((r) => r.json())
            .then((j: RiskResponse) => {
              if (!cancelled) {
                setData(j);
                setLoading(false);
              }
            })
            .catch(() => {
              if (!cancelled) setLoading(false);
            });
        }
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
    const now: ForecastBar = { ...splitLabel(nowHourLabel()), risk: data.risk };
    const rest: ForecastBar[] = data.hourly.map((h) => ({
      ...splitLabel(h.hourLabel),
      risk: h.risk,
    }));
    return [now, ...rest];
  }, [data]);

  const districtName = useMemo(() => {
    const d = getDistrict(district);
    return d ? (locale === "kk" ? d.nameKk : d.nameRu) : district;
  }, [district, locale]);
  const verdictIcon = data ? VERDICT_ICONS[data.verdict.icon] ?? AlertTriangle : AlertTriangle;

  function scrollToWhy() {
    whyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Screen>
      <div className="flex flex-col gap-4 pt-6 pb-10">
        {/* 1. TopBar (detail) */}
        <section data-testid="section-topbar">
          <TopBar
            variant="detail"
            title={districtName}
            subtitle={tt("app.city")}
            onBack={() => router.back()}
          />
        </section>

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
                chipToken={data.verdict.chipToken}
                sparse={data.sparse}
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
                />
                <MetricCard
                  name={tt("onb.trigger.ragweed")}
                  value={data.pollen.ragweed}
                  mode="word"
                  levelWord={pollenLevelWord(data.pollen.ragweed, locale)}
                />
                <MetricCard
                  name={tt("onb.trigger.birch")}
                  value={data.pollen.birch}
                  mode="word"
                  levelWord={pollenLevelWord(data.pollen.birch, locale)}
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
                />
                <MetricCard
                  name="PM10"
                  value={data.pm10?.ug ?? 0}
                  mode="unit"
                  unit={tt("unit.pm")}
                />
              </MetricRow>
            </Reveal>

            {/* 6. ForecastBars */}
            <Reveal data-testid="section-forecast" delay={240}>
              <ForecastBars
                bars={bars}
                selectedIndex={0}
                title={tt("detail.forecast")}
              />
            </Reveal>

            {/* 7. WhyCard */}
            <Reveal innerRef={whyRef} data-testid="section-why" delay={300}>
              <WhyCard
                risk={data.risk}
                breakdown={data.breakdown}
                locale={locale}
                tt={tt}
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

/** Hero — DESIGN §5.1.2. Lime organic blob hugging the left edge with the
 * num-hero risk + /10 inside; verdict icon + 2-line body/ink verdict to the
 * right; VerdictChip below. The blob tap scrolls to WhyCard. */
export function Hero({
  risk,
  verdictText,
  verdictIcon: VerdictIcon,
  chipToken,
  sparse,
  onTapWhy,
  tt,
}: {
  risk: number;
  verdictText: string;
  verdictIcon: LucideIcon;
  chipToken: string;
  sparse: boolean;
  onTapWhy: () => void;
  tt: TFunc;
}) {
  return (
    <section data-testid="section-hero" className="flex flex-col">
      <button
        type="button"
        onClick={onTapWhy}
        aria-label={`${tt("detail.why", { risk })}`}
        className="relative block w-full text-left transition-transform duration-150 active:scale-[.98]"
        style={{ height: 210, border: "none", padding: 0, background: "transparent", cursor: "pointer" }}
      >
        {/* Lime organic blob, ~55% width, hugging the left edge */}
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{
            width: "55%",
            height: 210,
            background: "var(--lime)",
            borderRadius: "42% 58% 56% 44% / 50% 48% 52% 50%",
          }}
        >
          <TopoTexture tone="ink" />
          <div className="relative flex h-full items-center justify-center gap-1">
            <span className="text-num-hero text-ink leading-none">{risk}</span>
            <span
              className="text-unit text-ink"
              style={{ alignSelf: "flex-start", marginTop: 18 }}
            >
              {tt("unit.risk")}
            </span>
          </div>
        </div>

        {/* Verdict icon + 2-line body/ink text to the right of the blob */}
        <div
          className="absolute top-6 flex items-start gap-2"
          style={{ left: "57%", right: 0 }}
        >
          <span
            className="inline-flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "#EDEFF1", color: "var(--ink)" }}
          >
            <VerdictIcon size={20} strokeWidth={2} />
          </span>
          <p className="text-body text-ink leading-[22px] line-clamp-2">
            {verdictText}
          </p>
        </div>

        {/* Sparse-data note in the hero (§7) */}
        {sparse ? (
          <p
            className="absolute bottom-0 left-0 text-caption leading-[18px]"
            style={{ color: "var(--ink-40)" }}
          >
            {tt("detail.sparse")}
          </p>
        ) : null}
      </button>

      {/* VerdictChip below the blob */}
      <div className="mt-3">
        <VerdictChip risk={risk} />
      </div>
    </section>
  );
}

/** ActionsCard — DESIGN §5.1.3. White card, h2 title «3 действия на завтра»,
 * three rows: 40px #EDEFF1 circle + reminder text. Reminder wording only (§8). */
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
      className="bg-white shadow-card"
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
                style={{ width: 40, height: 40, background: "#EDEFF1", color: "var(--ink)" }}
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
 * breakdown pct + legend rows with percentages. */
export function WhyCard({
  risk,
  breakdown,
  locale,
  tt,
}: {
  risk: number;
  breakdown: { key: "pm" | "pollen" | "wx"; labelRu: string; labelKk: string; pct: number }[];
  locale: Locale;
  tt: TFunc;
}) {
  return (
    <section
      className="flex flex-col"
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
    </section>
  );
}

/** BotBanner + push-preview card — DESIGN §5.1.8. Lime block (bell + connect)
 * in AccentBlock language, then a white "message" card with tomorrow-07:30
 * notification text composed from the data (mock send). */
export function BotBanner({
  districtName,
  data,
  actions,
  locale,
  tt,
}: {
  districtName: string;
  data: RiskResponse;
  actions: ActionEntry[];
  locale: Locale;
  tt: TFunc;
}) {
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
            className="shrink-0 rounded-full text-chip text-white transition-transform duration-150 active:scale-[.98]"
            style={{ background: "var(--ink)", height: 48, padding: "0 20px", border: "none", cursor: "pointer" }}
          >
            {tt("detail.botConnect")}
          </button>
        </div>
      </div>

      {/* Push preview "message" card */}
      <div
        data-testid="section-bot-push"
        className="bg-white shadow-card"
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
