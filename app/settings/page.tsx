"use client";

/**
 * Settings — DESIGN §5.6. The single editable surface for the profile that
 * onboarding produced. Reached ONLY from the Home gear (TopBar onSettings →
 * router.push('/settings')); the back chevron and the top-right «Готово» both
 * return to /home. No other page re-runs onboarding — the sole re-run path is
 * the «Сбросить профиль» danger button at the bottom (§5.6.3).
 *
 * Layout: --bg-home gradient, TopBar(settings), then white cards (--r-card,
 * --shadow-soft) per §4.7 — Language · Who · Diagnosis · Triggers · District —
 * each editing the live useProfile snapshot optimistically. A subtle
 * «Сохранено» caption flashes after every write (no save button). The danger
 * zone is separated at the bottom with a SecondaryButton that opens a bottom
 * sheet (same CSS-driven mechanic as AddPlaceSheet) to confirm the wipe.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  CircleHelp,
  Cloud,
  Flame,
  HeartPulse,
  Leaf,
  MapPin,
  Minus,
  Plus,
  Sprout,
  User,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/ui/TopBar";
import {
  OptionCard,
  SecondaryButton,
  ConditionCard,
} from "@/components/ui/Onboarding";
import { useProfile } from "@/lib/useProfile";
import { setLocale, useLocale, useT, type Locale } from "@/lib/i18n";
import { DISTRICTS } from "@/data/districts";
import { isDemo } from "@/lib/demo";
import {
  CONDITIONS,
  anySensitive,
  type Condition,
} from "@/lib/conditions";
import type { Profile, Trigger } from "@/lib/risk";

/** lucide name (lib/conditions.ts `icon`) → component. Keeps conditions.ts
 *  React-free (same convention as lib/actions.ts). */
const CONDITION_ICONS: Record<string, LucideIcon> = {
  wind: Wind,
  sprout: Sprout,
  leaf: Leaf,
  "heart-pulse": HeartPulse,
  baby: Baby,
  "circle-help": CircleHelp,
};

const EASING = "cubic-bezier(.32,.72,.29,.99)";
const SHEET_MS = 260;
const SAVED_MS = 1400;

export default function SettingsPage() {
  const router = useRouter();
  const tt = useT();
  const [locale] = useLocale();
  const { profile, isComplete, updateProfile, clearProfile, clearAnonId } =
    useProfile();
  const demo = isDemo();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No profile → onboarding (mirrors the /home guard). Demo mode is exempt so
  // /settings?demo=1 renders standalone. This guard does NOT re-trigger
  // onboarding for users who DO have a profile — only the reset button does.
  useEffect(() => {
    if (!isComplete && !demo) router.replace("/onboarding");
  }, [isComplete, demo, router]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  function flashSaved(): void {
    setSavedFlash(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedFlash(false), SAVED_MS);
  }

  function patch(p: Partial<Profile>): void {
    updateProfile(p);
    flashSaved();
  }

  function confirmReset(): void {
    clearProfile();
    clearAnonId();
    setConfirmOpen(false);
    router.replace("/onboarding");
  }

  // Defaults so the controls render before the client snapshot hydrates and
  // for the (rare) partial-profile case. Once `profile` resolves, every field
  // is driven by it.
  const who: Profile["who"] = profile?.who ?? "self";
  const childAge: number = profile?.childAge ?? 7;
  const diagnosis: string[] = Array.isArray(profile?.diagnosis)
    ? (profile!.diagnosis as string[])
    : [];
  const triggers: Trigger[] = profile?.triggers ?? [];
  const district: string = profile?.district ?? DISTRICTS[0].slug;

  const nameField = locale === "kk" ? "nameKk" : "nameRu";

  return (
    <div
      className="flex w-full justify-center"
      style={{ minHeight: "100dvh", background: "var(--bg-page)" }}
    >
      <div
        className="relative w-full max-w-[430px] px-5"
        style={{ minHeight: "100dvh", background: "var(--bg-home)" }}
      >
        <div className="flex flex-col gap-4 pt-6 pb-10">
          <TopBar
            variant="settings"
            title={tt("settings.title")}
            backAria={tt("settings.backAria")}
            doneLabel={tt("settings.done")}
            onBack={() => router.push("/home")}
            onDone={() => router.push("/home")}
          />

          {/* Saved flash — subtle, sits under the TopBar on the slate surface */}
          <div style={{ minHeight: 18 }}>
            {savedFlash ? (
              <p
                className="text-caption"
                style={{ color: "var(--white-70)" }}
                role="status"
              >
                {tt("settings.saved")}
              </p>
            ) : null}
          </div>

          {/* Language */}
          <SettingsCard label={tt("settings.language")}>
            <SegmentedLanguage
              value={locale}
              onChange={(l) => {
                setLocale(l);
                flashSaved();
              }}
            />
          </SettingsCard>

          {/* Who + child age (parent only) */}
          <SettingsCard label={tt("settings.who")}>
            <div className="flex flex-col gap-3">
              <OptionCard
                icon={User}
                selected={who === "self"}
                onClick={() => patch({ who: "self", childAge: undefined })}
              >
                {tt("settings.who.self")}
              </OptionCard>
              <OptionCard
                icon={Baby}
                selected={who === "parent"}
                onClick={() =>
                  patch({ who: "parent", childAge: childAge || 7 })
                }
              >
                {tt("settings.who.parent")}
              </OptionCard>
            </div>
            {who === "parent" ? (
              <div className="mt-3">
                <ChildAgeStepper
                  value={childAge || 7}
                  onChange={(n) => patch({ childAge: n })}
                  label={tt("settings.childAge")}
                  suffix={tt("onb.childAge.suffix")}
                />
              </div>
            ) : null}
          </SettingsCard>

          {/* Diagnosis — multi-select of condition ids from lib/conditions.ts,
              the SAME list onboarding S2 renders. Toggling updates the array
              and re-derives `sensitive` (cautious thresholds) from the set. */}
          <SettingsCard label={tt("settings.diagnosis")}>
            <DiagnosisGrid
              value={diagnosis}
              onToggle={(id) => {
                const next = diagnosis.includes(id)
                  ? diagnosis.filter((x) => x !== id)
                  : [...diagnosis, id];
                patch({
                  diagnosis: next,
                  sensitive: anySensitive(next),
                });
              }}
            />
          </SettingsCard>

          {/* Triggers */}
          <SettingsCard label={tt("settings.triggers")}>
            <TriggersEditor
              triggers={triggers}
              toggle={(t) => {
                const next = triggers.includes(t)
                  ? triggers.filter((x) => x !== t)
                  : [...triggers, t];
                patch({ triggers: next });
              }}
            />
          </SettingsCard>

          {/* District */}
          <SettingsCard label={tt("settings.district")}>
            <div className="flex flex-col gap-2">
              {DISTRICTS.map((d) => (
                <OptionCard
                  key={d.slug}
                  icon={MapPin}
                  selected={d.slug === district}
                  onClick={() => patch({ district: d.slug })}
                >
                  {d[nameField]}
                </OptionCard>
              ))}
            </div>
          </SettingsCard>

          {/* Danger zone */}
          <div className="mt-2 flex flex-col gap-3">
            <p
              className="px-1 text-caption"
              style={{ color: "var(--white-70)" }}
            >
              {tt("settings.reset")}
            </p>
            <SecondaryButton onClick={() => setConfirmOpen(true)}>
              {tt("settings.resetButton")}
            </SecondaryButton>
          </div>
        </div>

        <ResetConfirmSheet
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmReset}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Sub-components — all local to this page. Each is pure presentational +
 * a callback; the parent owns the profile state via useProfile.
 * ───────────────────────────────────────────────────────────────────── */

/** White card (--r-card, --shadow-soft) with a chip/600 label and a body
 *  gap-3. The card is the §5.6 "editable section" container; the controls
 *  inside are the onboarding §4.7 controls. */
function SettingsCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-3 bg-white"
      style={{
        borderRadius: "var(--r-card)",
        padding: 20,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <h2 className="text-chip text-ink" style={{ fontWeight: 600 }}>
        {label}
      </h2>
      {children}
    </section>
  );
}

/** Segmented ҚАЗ/РУС pill adapted for a white card surface: a light --icon-bg
 *  capsule with a sliding --ink pill (text --lime when active, --ink when
 *  inactive). Same glide mechanic as LocalePill / ProgressDots (§7). Switching
 *  sets the i18n locale live + persists (handled by the parent via setLocale). */
const SEG_WIDTH = 48;
const SEG_HEIGHT = 28;
const CAP_HEIGHT = 36;
const CAP_PAD = 4;

function SegmentedLanguage({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (l: Locale) => void;
}) {
  const tt = useT();
  const activeIndex = value === "kk" ? 0 : 1;
  const capsuleWidth = SEG_WIDTH * 2 + CAP_PAD * 2;
  const segs: { key: Locale; labelKey: "settings.lang.kk" | "settings.lang.ru" }[] = [
    { key: "kk", labelKey: "settings.lang.kk" },
    { key: "ru", labelKey: "settings.lang.ru" },
  ];
  return (
    <div
      role="tablist"
      aria-label={tt("settings.language")}
      className="relative inline-flex"
      style={{
        height: CAP_HEIGHT,
        width: capsuleWidth,
        padding: CAP_PAD,
        borderRadius: "var(--r-full)",
        background: "var(--icon-bg)",
        border: "none",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute block"
        style={{
          top: CAP_PAD,
          left: CAP_PAD,
          height: SEG_HEIGHT,
          width: SEG_WIDTH,
          borderRadius: "var(--r-full)",
          background: "var(--ink)",
          transform: `translateX(${activeIndex * SEG_WIDTH}px)`,
          transition: `transform 220ms ${EASING}`,
        }}
      />
      {segs.map((seg, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={seg.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.key)}
            className="relative inline-flex items-center justify-center"
            style={{
              width: SEG_WIDTH,
              height: SEG_HEIGHT,
              borderRadius: "var(--r-full)",
              border: "none",
              padding: 0,
              background: "transparent",
              color: active ? "var(--lime)" : "var(--ink)",
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 16,
              cursor: "pointer",
              zIndex: 1,
            }}
          >
            {tt(seg.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

/** Numeric stepper for the parent's child age. Mirrors the onboarding S2
 *  field but as a +/- stepper (h=56 white pill) so the value is one-tap
 *  editable. Clamps to 1..17. */
function ChildAgeStepper({
  value,
  onChange,
  label,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  suffix: string;
}) {
  const clamp = (n: number) => Math.max(1, Math.min(17, n));
  return (
    <div className="flex flex-col gap-2">
      <label className="text-caption" style={{ color: "var(--ink-60)" }}>
        {label}
      </label>
      <div
        className="flex items-center justify-between rounded-full px-2"
        style={{ height: 56, background: "var(--icon-bg)" }}
      >
        <StepperBtn
          aria-label="−"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 1}
        >
          <Minus size={20} strokeWidth={2} />
        </StepperBtn>
        <div className="flex items-baseline gap-1.5">
          <span className="text-h2 text-ink leading-none">{value}</span>
          <span className="text-caption" style={{ color: "var(--ink-60)" }}>
            {suffix}
          </span>
        </div>
        <StepperBtn
          aria-label="+"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= 17}
        >
          <Plus size={20} strokeWidth={2} />
        </StepperBtn>
      </div>
    </div>
  );
}

function StepperBtn({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="tappable inline-flex items-center justify-center rounded-full text-ink disabled:opacity-40"
      style={{
        width: 44,
        height: 44,
        background: "var(--white)",
        border: "none",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/** Diagnosis selector — the SAME condition list as onboarding S2, sourced
 *  from lib/conditions.ts (single source of truth). Multi-select: a user can
 *  have both asthma and pollinosis. Rendered as a 2-column CSS grid of
 *  ConditionCards (align-items: stretch → equal row heights per row) matching
 *  the onboarding §4.7 trigger grid. */
function DiagnosisGrid({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (id: string) => void;
}) {
  const [locale] = useLocale();
  const labelField: keyof Condition = locale === "kk" ? "labelKk" : "labelRu";
  return (
    <div
      className="grid grid-cols-2 gap-3"
      style={{ alignItems: "stretch" }}
    >
      {CONDITIONS.map((c) => (
        <ConditionCard
          key={c.id}
          icon={CONDITION_ICONS[c.icon] ?? CircleHelp}
          selected={value.includes(c.id)}
          onClick={() => onToggle(c.id)}
        >
          {c[labelField]}
        </ConditionCard>
      ))}
    </div>
  );
}

/** Triggers editor — two labeled groups (Пыльца / Воздух) of multiselect
 *  OptionCards in a 2-column grid, matching onboarding S3. */
function TriggersEditor({
  triggers,
  toggle,
}: {
  triggers: Trigger[];
  toggle: (t: Trigger) => void;
}) {
  const tt = useT();
  const pollen: { key: Trigger; label: string; icon: LucideIcon }[] = [
    { key: "wormwood", label: tt("onb.trigger.wormwood"), icon: Sprout },
    { key: "birch", label: tt("onb.trigger.birch"), icon: Leaf },
    { key: "ragweed", label: tt("onb.trigger.ragweed"), icon: Sprout },
  ];
  const air: { key: Trigger; label: string; icon: LucideIcon }[] = [
    { key: "pm25", label: tt("onb.trigger.pm25"), icon: Cloud },
    { key: "smoke", label: tt("onb.trigger.smoke"), icon: Flame },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-caption" style={{ color: "var(--ink-60)" }}>
        {tt("onb.group.pollen")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {pollen.map((o) => (
          <OptionCard
            key={o.key}
            icon={o.icon}
            selected={triggers.includes(o.key)}
            onClick={() => toggle(o.key)}
          >
            {o.label}
          </OptionCard>
        ))}
      </div>
      <div className="mt-2 text-caption" style={{ color: "var(--ink-60)" }}>
        {tt("onb.group.air")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {air.map((o) => (
          <OptionCard
            key={o.key}
            icon={o.icon}
            selected={triggers.includes(o.key)}
            onClick={() => toggle(o.key)}
          >
            {o.label}
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

/** Reset confirmation bottom sheet — same CSS-driven slide mechanic as
 *  AddPlaceSheet (§7): always mounted, driven by `open`, slides up from
 *  translateY(100%)→0 with a fading backdrop, 260ms cubic-bezier. `inert`
 *  + pointer-events:none make it inert while closed. */
function ResetConfirmSheet({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const tt = useT();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      aria-hidden={!open}
      inert={!open}
      style={{
        background: "rgba(33,33,33,.40)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: `opacity ${SHEET_MS}ms ${EASING}`,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px]"
        style={{ padding: "0 16px 16px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-col gap-4 bg-white shadow-float"
          style={{
            borderRadius: "var(--r-card)",
            padding: 20,
            transform: open ? "translateY(0)" : "translateY(100%)",
            transition: `transform ${SHEET_MS}ms ${EASING}`,
          }}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-h2 text-ink">{tt("settings.resetConfirmTitle")}</h2>
            <p className="text-body" style={{ color: "var(--ink-60)" }}>
              {tt("settings.resetConfirmBody")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="tappable w-full rounded-full text-h2 text-white"
              style={{
                height: 56,
                background: "var(--risk-severe)",
                border: "none",
                padding: "0 20px",
                cursor: "pointer",
              }}
            >
              {tt("settings.resetConfirmOk")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="tappable w-full rounded-full bg-white text-h2 text-ink shadow-card"
              style={{ height: 56, border: "none", padding: "0 20px", cursor: "pointer" }}
            >
              {tt("settings.resetConfirmCancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

