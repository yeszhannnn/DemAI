"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  ChevronLeft,
  CircleHelp,
  Cloud,
  Flame,
  HeartPulse,
  Languages,
  Leaf,
  LocateFixed,
  MapPin,
  Sprout,
  User,
  Wand,
  Wind,
} from "lucide-react";
import {
  OptionCard,
  PrimaryButton,
  ProgressDots,
} from "@/components/ui/Onboarding";
import { useProfile } from "@/lib/useProfile";
import { setLocale, t, useLocale, useT, type Locale } from "@/lib/i18n";
import { DISTRICTS } from "@/data/districts";
import type { Diagnosis, Profile, Trigger } from "@/lib/risk";

const TOTAL_STEPS = 5;

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function triggersForDiagnosis(d: Diagnosis): Trigger[] {
  const pollen: Trigger[] = ["wormwood", "birch", "ragweed"];
  const air: Trigger[] = ["pm25", "smoke"];
  switch (d) {
    case "pollinosis":
      return pollen;
    case "asthma":
      return air;
    case "both":
      return [...pollen, ...air];
    default:
      return [...pollen, ...air];
  }
}

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

function OnboardingFlow() {
  const router = useRouter();
  const { profile, isComplete, saveProfile } = useProfile();
  const [step, setStep] = useState(0);

  // Draft state (saved only at the finish tap).
  const [who, setWho] = useState<Profile["who"] | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [childAge, setChildAge] = useState<number>(7);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "denied">(
    "idle",
  );

  // Returning-user guard (§7): a complete profile never re-runs onboarding.
  useEffect(() => {
    if (isComplete && profile?.district) {
      router.replace(`/d/${profile.district}`);
    }
  }, [isComplete, profile, router]);

  function finish(district: string) {
    const p: Profile = {
      who: who ?? "self",
      childAge: who === "parent" ? childAge : undefined,
      diagnosis: diagnosis ?? "unknown",
      triggers,
      district,
      sensitive: diagnosis === "unknown",
    };
    saveProfile(p);
    router.replace(`/d/${district}`);
  }

  function selectDiagnosis(d: Diagnosis) {
    setDiagnosis(d);
    if (who === "self" && d !== "unknown") {
      setStep(3);
    }
  }

  function toggleTrigger(tg: Trigger) {
    setTriggers((prev) =>
      prev.includes(tg) ? prev.filter((x) => x !== tg) : [...prev, tg],
    );
  }

  function pickForMe() {
    setTriggers(triggersForDiagnosis(diagnosis ?? "unknown"));
    setStep(4);
  }

  function useGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        let nearest = DISTRICTS[0];
        let best = Infinity;
        for (const d of DISTRICTS) {
          const km = haversineKm(here, d);
          if (km < best) {
            best = km;
            nearest = d;
          }
        }
        setGeoStatus("idle");
        finish(nearest.slug);
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  const canContinueS2 =
    diagnosis !== null && (who !== "parent" || childAge > 0);
  const showContinueS2 = who === "parent" || diagnosis === "unknown";

  return (
    <div
      className="flex w-full justify-center"
      style={{ minHeight: "100dvh", background: "var(--bg-page)" }}
    >
      <div
        className="relative w-full max-w-[430px] px-5"
        style={{ minHeight: "100dvh", background: "var(--bg-home)" }}
      >
        <TopBar
          step={step}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
        />

        <main className="flex flex-col pb-32" style={{ minHeight: "60dvh" }}>
          {step === 0 && (
            <Step0
              onPick={(l) => {
                setLocale(l);
                setStep(1);
              }}
            />
          )}
          {step === 1 && (
            <Step1 onPick={(w) => { setWho(w); setStep(2); }} />
          )}
          {step === 2 && (
            <Step2
              who={who}
              diagnosis={diagnosis}
              childAge={childAge}
              setChildAge={setChildAge}
              selectDiagnosis={selectDiagnosis}
              showContinue={showContinueS2}
              canContinue={canContinueS2}
              onContinue={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3
              triggers={triggers}
              toggle={toggleTrigger}
              pickForMe={pickForMe}
              onContinue={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step4
              geoStatus={geoStatus}
              onPickDistrict={finish}
              onGeolocate={useGeolocation}
            />
          )}
        </main>

        <TapCounter />
      </div>
    </div>
  );
}

function TopBar({ step, onBack }: { step: number; onBack: () => void }) {
  const tt = useT();
  return (
    <div className="flex items-center gap-3 pt-6 pb-4">
      {step > 0 ? (
        <button
          type="button"
          aria-label={tt("onb.back")}
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-95"
          style={{ background: "var(--glass-dark)", backdropFilter: "blur(12px)" }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
      ) : (
        <span className="h-9 w-9" />
      )}
      <ProgressDots total={TOTAL_STEPS} current={step} />
    </div>
  );
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mt-2 mb-5 flex flex-col gap-1">
      <h1 className="text-h1 text-white">{title}</h1>
      {hint ? (
        <p className="text-caption" style={{ color: "var(--white-70)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Step0({ onPick }: { onPick: (l: Locale) => void }) {
  const tt = useT();
  return (
    <div>
      <StepTitle title={tt("onb.s0.title")} hint={tt("onb.s0.hint")} />
      <div className="flex flex-col gap-3">
        <OptionCard icon={Languages} onClick={() => onPick("kk")}>
          {tt("onb.lang.kk")}
        </OptionCard>
        <OptionCard icon={Languages} onClick={() => onPick("ru")}>
          {tt("onb.lang.ru")}
        </OptionCard>
      </div>
    </div>
  );
}

function Step1({ onPick }: { onPick: (w: Profile["who"]) => void }) {
  const tt = useT();
  return (
    <div>
      <StepTitle title={tt("onb.s1.title")} hint={tt("onb.s1.hint")} />
      <div className="flex flex-col gap-3">
        <OptionCard icon={User} onClick={() => onPick("self")}>
          {tt("onb.who.self")}
        </OptionCard>
        <OptionCard icon={Baby} onClick={() => onPick("parent")}>
          {tt("onb.who.parent")}
        </OptionCard>
      </div>
    </div>
  );
}

interface Step2Props {
  who: Profile["who"] | null;
  diagnosis: Diagnosis | null;
  childAge: number;
  setChildAge: (n: number) => void;
  selectDiagnosis: (d: Diagnosis) => void;
  showContinue: boolean;
  canContinue: boolean;
  onContinue: () => void;
}

function Step2({
  who,
  diagnosis,
  childAge,
  setChildAge,
  selectDiagnosis,
  showContinue,
  canContinue,
  onContinue,
}: Step2Props) {
  const tt = useT();
  const options: { key: Diagnosis; label: string; icon: typeof Wind }[] = [
    { key: "asthma", label: tt("onb.diag.asthma"), icon: Wind },
    { key: "pollinosis", label: tt("onb.diag.pollinosis"), icon: Sprout },
    { key: "both", label: tt("onb.diag.both"), icon: HeartPulse },
    { key: "unknown", label: tt("onb.diag.unknown"), icon: CircleHelp },
  ];
  return (
    <div>
      <StepTitle title={tt("onb.s2.title")} hint={tt("onb.s2.hint")} />

      {who === "parent" && (
        <div className="mb-4 flex flex-col gap-2">
          <label
            className="text-caption text-white"
            htmlFor="child-age"
          >
            {tt("onb.childAge.label")}
          </label>
          <div
            className="flex items-center gap-2 rounded-full px-4"
            style={{ height: 56, background: "var(--white)" }}
          >
            <input
              id="child-age"
              type="number"
              inputMode="numeric"
              min={0}
              max={17}
              value={childAge}
              onChange={(e) =>
                setChildAge(
                  Math.max(0, Math.min(17, Number(e.target.value) || 0)),
                )
              }
              className="w-full bg-transparent text-h2 text-ink outline-none"
              style={{ border: "none" }}
              aria-label={tt("onb.childAge.label")}
            />
            <span className="text-caption" style={{ color: "var(--ink-60)" }}>
              {tt("onb.childAge.suffix")}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <OptionCard
            key={o.key}
            icon={o.icon}
            selected={diagnosis === o.key}
            onClick={() => selectDiagnosis(o.key)}
          >
            {o.label}
          </OptionCard>
        ))}
      </div>

      {diagnosis === "unknown" && (
        <p
          className="mt-4 text-body"
          style={{ color: "var(--white)" }}
        >
          {tt("onb.sensitive.copy")}
        </p>
      )}

      {showContinue && (
        <div className="mt-6">
          <PrimaryButton disabled={!canContinue} onClick={onContinue}>
            {tt("onb.continue")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

interface Step3Props {
  triggers: Trigger[];
  toggle: (t: Trigger) => void;
  pickForMe: () => void;
  onContinue: () => void;
}

function Step3({ triggers, toggle, pickForMe, onContinue }: Step3Props) {
  const tt = useT();
  const pollen: { key: Trigger; label: string; icon: typeof Sprout }[] = [
    { key: "wormwood", label: tt("onb.trigger.wormwood"), icon: Sprout },
    { key: "birch", label: tt("onb.trigger.birch"), icon: Leaf },
    { key: "ragweed", label: tt("onb.trigger.ragweed"), icon: Sprout },
  ];
  const air: { key: Trigger; label: string; icon: typeof Cloud }[] = [
    { key: "pm25", label: tt("onb.trigger.pm25"), icon: Cloud },
    { key: "smoke", label: tt("onb.trigger.smoke"), icon: Flame },
  ];
  return (
    <div>
      <StepTitle title={tt("onb.s3.title")} hint={tt("onb.s3.hint")} />

      <div className="mb-2 text-caption text-white">
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

      <div className="mb-2 mt-5 text-caption text-white">
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

      <button
        type="button"
        onClick={pickForMe}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full text-chip text-ink transition-transform active:scale-95"
        style={{ height: 48, background: "var(--white)" }}
      >
        <Wand size={18} strokeWidth={2} />
        {tt("onb.triggers.pickForMe")}
      </button>

      <div className="mt-3">
        <PrimaryButton onClick={onContinue}>
          {tt("onb.continue")}
        </PrimaryButton>
      </div>
    </div>
  );
}

interface Step4Props {
  geoStatus: "idle" | "locating" | "denied";
  onPickDistrict: (slug: string) => void;
  onGeolocate: () => void;
}

function Step4({ geoStatus, onPickDistrict, onGeolocate }: Step4Props) {
  const tt = useT();
  const [locale] = useLocale();
  const nameField = locale === "kk" ? "nameKk" : "nameRu";
  return (
    <div>
      <StepTitle title={tt("onb.s4.title")} hint={tt("onb.s4.hint")} />

      <div className="flex flex-col gap-2">
        {DISTRICTS.map((d) => (
          <OptionCard
            key={d.slug}
            icon={MapPin}
            onClick={() => onPickDistrict(d.slug)}
          >
            {d[nameField]}
          </OptionCard>
        ))}
      </div>

      {geoStatus === "denied" && (
        <p className="mt-3 text-caption" style={{ color: "var(--white)" }}>
          {tt("onb.geo.denied")}
        </p>
      )}

      <button
        type="button"
        onClick={onGeolocate}
        disabled={geoStatus === "locating"}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full text-chip text-white transition-transform active:scale-95 disabled:opacity-60"
        style={{
          height: 48,
          background: "var(--glass-light)",
          backdropFilter: "blur(12px)",
        }}
      >
        <LocateFixed size={18} strokeWidth={2} />
        {geoStatus === "locating"
          ? tt("onb.geo.locating")
          : tt("onb.district.geo")}
      </button>
    </div>
  );
}

/**
 * TapCounter — dev-only overlay (PROMPTS §6.5).
 * Visible only with `?taps=1`. Counts every pointerdown on the document
 * (excluding taps on the overlay itself) and displays the running total
 * against the ≤7-taps target. Proves the acceptance criterion locally;
 * never shipped to production.
 */
function TapCounter() {
  const enabled = useTapsEnabled();
  const [count, setCount] = useState(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (overlayRef.current && target && overlayRef.current.contains(target)) {
        return;
      }
      setCount((c) => c + 1);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [enabled]);

  if (!enabled) return null;
  const within = count <= 7;
  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed right-3 top-3 z-50 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-chip text-ink"
      style={{ background: "var(--lime)" }}
    >
      <span>{t("taps.label", undefined, { n: count })}</span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white"
        style={{ background: within ? "var(--ink)" : "var(--risk-severe)" }}
      >
        {within ? "✓" : "!"}
      </span>
    </div>
  );
}

/** Read `?taps=1` via useSyncExternalStore (SSR-safe, no setState-in-effect). */
function useTapsEnabled(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("taps") === "1",
    () => false,
  );
}

