"use client";

import { useState } from "react";
import {
  Backpack,
  Bell,
  Home,
  Settings,
} from "lucide-react";
import { Screen } from "@/components/Screen";
import { IconCircle } from "@/components/ui/IconCircle";
import type { IconCircleSize, IconCircleVariant } from "@/components/ui/IconCircle";
import { TopBar } from "@/components/ui/TopBar";
import { GlassPill, PillBadge } from "@/components/ui/Pills";
import { AccentBlock } from "@/components/ui/AccentBlock";
import { VerdictChip } from "@/components/ui/VerdictChip";
import { MetricCard } from "@/components/ui/MetricCard";
import { ForecastBars, ForecastBar } from "@/components/ui/ForecastBars";
import { BottomToggle, BottomToggleActive } from "@/components/ui/BottomToggle";
import {
  OptionCard,
  PrimaryButton,
  ProgressDots,
  SecondaryButton,
} from "@/components/ui/Onboarding";
import { LocationCard, LocationCardPeek, PeekFade } from "@/components/ui/LocationCard";

const ICON_SIZES: IconCircleSize[] = [32, 36, 40, 44];
const VARIANTS: { key: IconCircleVariant; label: string }[] = [
  { key: "light", label: "light" },
  { key: "white", label: "white" },
  { key: "glassDark", label: "glassDark" },
  { key: "glassLight", label: "glassLight" },
  { key: "black", label: "black" },
];

const BARS: ForecastBar[] = [
  { hour: "12:00", day: "пт", risk: 3 },
  { hour: "13:00", day: "пт", risk: 4 },
  { hour: "14:00", day: "пт", risk: 6 },
  { hour: "15:00", day: "сб", risk: 7 },
  { hour: "16:00", day: "сб", risk: 8 },
  { hour: "17:00", day: "сб", risk: 6 },
  { hour: "18:00", day: "сб", risk: 5 },
  { hour: "19:00", day: "сб", risk: 4 },
  { hour: "20:00", day: "сб", risk: 3 },
  { hour: "21:00", day: "сб", risk: 2 },
  { hour: "22:00", day: "сб", risk: 2 },
  { hour: "23:00", day: "сб", risk: 1 },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-h2 text-ink">{title}</h2>
        {hint ? (
          <p className="text-caption" style={{ color: "var(--ink-60)" }}>
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function KitPage() {
  const [toggle, setToggle] = useState<BottomToggleActive>("map");
  const [selBar, setSelBar] = useState<number>(3);
  const [opt, setOpt] = useState<string>("self");
  const [step, setStep] = useState<number>(2);

  return (
    <Screen>
      <div className="flex flex-col gap-8 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 text-ink">UI Kit</h1>
          <p className="text-caption" style={{ color: "var(--ink-60)" }}>
            Every presentational component, every state. Tokens from DESIGN §3–§4.
          </p>
        </header>

        {/* 1. IconCircle — all sizes × variants */}
        <Section title="IconCircle" hint="d=44 default · size 32/36/40/44 · light/white/glassDark/glassLight/black">
          <div className="flex flex-col gap-4">
            {VARIANTS.map((v) => (
              <div key={v.key} className="flex flex-col gap-2">
                <div className="text-caption text-ink">{v.label}</div>
                <div
                  className="flex flex-wrap items-center gap-3 rounded-card p-4"
                  style={
                    v.key === "glassDark" || v.key === "glassLight"
                      ? { background: "var(--bg-home)" }
                      : { background: "var(--bg-light)" }
                  }
                >
                  {ICON_SIZES.map((s) => (
                    <IconCircle key={s} icon={Settings} size={s} variant={v.key} aria-label={`${v.label} ${s}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. TopBar — three variants */}
        <Section title="TopBar" hint="map · home · detail">
          <div className="flex flex-col gap-6">
            <div
              className="rounded-card p-4"
              style={{ background: "var(--bg-home)" }}
            >
              <TopBar variant="map" title="Алматы" subtitle="Бостандык" avatarUrl="" />
            </div>
            <div className="rounded-card p-4" style={{ background: "var(--bg-home)" }}>
              <TopBar variant="home" title="Алматы" />
            </div>
            <div className="rounded-card p-4" style={{ background: "var(--bg-light)" }}>
              <TopBar variant="detail" title="Бостандык ауданы" subtitle="Алматы" />
            </div>
          </div>
        </Section>

        {/* 3. PillBadge + GlassPill */}
        <Section title="PillBadge / GlassPill">
          <div className="flex flex-wrap items-center gap-3">
            <PillBadge>Real-time</PillBadge>
            <PillBadge>Live</PillBadge>
            <div className="flex-1" />
            <GlassPill>Мои места ⌄</GlassPill>
          </div>
          <div className="rounded-card p-4" style={{ background: "var(--bg-home)" }}>
            <div className="flex items-center gap-3">
              <PillBadge>Real-time</PillBadge>
              <GlassPill>Мои места ⌄</GlassPill>
            </div>
          </div>
        </Section>

        {/* 4. AccentBlock */}
        <Section title="AccentBlock" hint="lime · --r-inner · topo texture · value + unit superscript + 2-line verdict">
          <AccentBlock
            value="7"
            unit="/10"
            verdict="Высокий риск — смотри действия ниже"
            onClick={() => {}}
          />
        </Section>

        {/* 5. VerdictChip — all four bands */}
        <Section title="VerdictChip" hint="risk 2 · 5 · 7 · 9 → low / mid / high / severe">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictChip risk={2} />
            <VerdictChip risk={5} />
            <VerdictChip risk={7} />
            <VerdictChip risk={9} />
          </div>
        </Section>

        {/* 6. MetricCard — both modes */}
        <Section title="MetricCard" hint="mode unit (µg/m³ + particle dots) · mode word (/5 + level word)">
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            <MetricCard name="PM2.5" value={15} mode="unit" unit="мкг/м³" />
            <MetricCard name="PM10" value={28} mode="unit" unit="мкг/м³" />
            <MetricCard name="PM1" value={9} mode="unit" unit="мкг/м³" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            <MetricCard name="Полынь" value={4} mode="word" levelWord="высокий" />
            <MetricCard name="Амброзия" value={2} mode="word" levelWord="умеренный" />
            <MetricCard name="Берёза" value={0} mode="word" levelWord="нет" />
          </div>
        </Section>

        {/* 7. ForecastBars — hatched selected bar visible */}
        <Section title="ForecastBars" hint="pure CSS/divs · hatched selected bar · tooltip chip above">
          <ForecastBars bars={BARS} selectedIndex={selBar} onSelect={setSelBar} />
        </Section>

        {/* 8. BottomToggle */}
        <Section title="BottomToggle" hint="active: map | list">
          <BottomToggle active={toggle} onChange={setToggle} />
        </Section>

        {/* 9. Buttons / OptionCard / ProgressDots */}
        <Section title="Buttons · OptionCard · ProgressDots">
          <div className="flex flex-col gap-3">
            <PrimaryButton>Продолжить</PrimaryButton>
            <SecondaryButton>Пропустить</SecondaryButton>
          </div>
          <div className="flex flex-col gap-3">
            <OptionCard icon={Home} selected={opt === "self"} onClick={() => setOpt("self")}>
              Я сам
            </OptionCard>
            <OptionCard icon={Backpack} selected={opt === "parent"} onClick={() => setOpt("parent")}>
              Родитель ребёнка
            </OptionCard>
          </div>
          <ProgressDots total={5} current={step} />
          <div className="flex gap-2">
            <button type="button" className="text-caption text-ink underline" onClick={() => setStep(Math.max(0, step - 1))}>prev</button>
            <button type="button" className="text-caption text-ink underline" onClick={() => setStep(Math.min(4, step + 1))}>next</button>
          </div>
        </Section>

        {/* 10. LocationCard + PeekFade */}
        <Section title="LocationCard + PeekFade" hint="full card + peeking card with fade to --bg-home">
          <div
            className="flex flex-col gap-0 rounded-card p-4"
            style={{ background: "var(--bg-home)" }}
          >
            <LocationCard
              icon={Home}
              title="Дом"
              address="Бостандык ауданы, Алматы"
              value="7"
              unit="/10"
              verdict="Высокий риск — смотри действия ниже"
            />
            <PeekFade className="mt-[-16px]">
              <LocationCardPeek
                icon={Backpack}
                title="Школа"
                address="Медеуский ауданы, Алматы"
              />
            </PeekFade>
          </div>
        </Section>

        {/* BotBanner-style AccentBlock (bell + connect) — bonus anatomy check */}
        <Section title="AccentBlock (BotBanner language)">
          <AccentBlock
            value={<Bell size={28} strokeWidth={2} />}
            verdict="Утренний прогноз — в Telegram к 7:30"
            onClick={() => {}}
          />
        </Section>
      </div>
    </Screen>
  );
}
