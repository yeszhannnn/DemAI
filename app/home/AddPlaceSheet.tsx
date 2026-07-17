"use client";

/**
 * AddPlaceSheet — DESIGN §5.2 / PROMPTS §8.3 / §7. A bottom sheet (modal) to
 * add a place: preset label chips (Дом / Школа / Секция) + a district picker
 * reusing the onboarding OptionCards. School uses the backpack icon per §3.4.
 *
 * Motion (§7): the sheet is always mounted and driven purely by CSS on the
 * `open` prop — it slides up from translateY(100%)→0 and the backdrop fades in,
 * 260ms cubic-bezier(.32,.72,.29,.99); closing reverses. No effects/setState,
 * so there is no pop and no setState-in-effect. The sheet is a --r-card floating
 * card (no square corners — §8); `inert` + pointer-events:none make it inert
 * while closed.
 */
import { useState } from "react";
import { Backpack, Dumbbell, Home, MapPin, X, type LucideIcon } from "lucide-react";
import { OptionCard, PrimaryButton } from "@/components/ui/Onboarding";
import { useLocale, useT } from "@/lib/i18n";
import { DISTRICTS } from "@/data/districts";

const EASING = "cubic-bezier(.32,.72,.29,.99)";
const DURATION = 260;

const PRESETS: { key: "place.home" | "place.school" | "place.section"; icon: LucideIcon }[] = [
  { key: "place.home", icon: Home },
  { key: "place.school", icon: Backpack },
  { key: "place.section", icon: Dumbbell },
];

export interface AddPlaceSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (label: string, district: string) => void;
}

export function AddPlaceSheet({ open, onClose, onConfirm }: AddPlaceSheetProps) {
  const tt = useT();
  const [locale] = useLocale();
  const [labelKey, setLabelKey] =
    useState<"place.home" | "place.school" | "place.section">("place.home");
  const [district, setDistrict] = useState<string>(DISTRICTS[0].slug);

  const nameField = locale === "kk" ? "nameKk" : "nameRu";

  function confirm(): void {
    onConfirm(tt(labelKey), district);
  }

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
        transition: `opacity ${DURATION}ms ${EASING}`,
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
            transition: `transform ${DURATION}ms ${EASING}`,
          }}
        >
          <SheetBody
            labelKey={labelKey}
            setLabelKey={setLabelKey}
            district={district}
            setDistrict={setDistrict}
            nameField={nameField}
            tt={tt}
            onClose={onClose}
            onConfirm={confirm}
          />
        </div>
      </div>
    </div>
  );
}

type LabelKey = "place.home" | "place.school" | "place.section";
type TFunc = (key: "home.addTitle" | "home.addHint" | "home.addLabel" | "home.addDistrict" | "home.addCancel" | "home.addConfirm" | LabelKey) => string;

function SheetBody({
  labelKey,
  setLabelKey,
  district,
  setDistrict,
  nameField,
  tt,
  onClose,
  onConfirm,
}: {
  labelKey: LabelKey;
  setLabelKey: (k: LabelKey) => void;
  district: string;
  setDistrict: (s: string) => void;
  nameField: "nameKk" | "nameRu";
  tt: TFunc;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 text-ink">{tt("home.addTitle")}</h2>
          <p className="text-caption" style={{ color: "var(--ink-60)" }}>
            {tt("home.addHint")}
          </p>
        </div>
        <button
          type="button"
          aria-label={tt("home.addCancel")}
          onClick={onClose}
          className="tappable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink"
          style={{ background: "var(--icon-bg)", border: "none", cursor: "pointer" }}
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Label chips */}
      <div className="flex flex-col gap-2">
        <div className="text-caption" style={{ color: "var(--ink-60)" }}>
          {tt("home.addLabel")}
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const selected = p.key === labelKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setLabelKey(p.key)}
                aria-pressed={selected}
                className="tappable inline-flex items-center gap-2 rounded-full text-chip text-ink"
                style={{
                  height: 44,
                  padding: "0 16px",
                  background: "var(--icon-bg)",
                  border: selected ? "2px solid var(--ink)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                <p.icon size={18} strokeWidth={2} />
                {tt(p.key)}
              </button>
            );
          })}
        </div>
      </div>

      {/* District picker (reusing OptionCards) */}
      <div className="flex flex-col gap-2">
        <div className="text-caption" style={{ color: "var(--ink-60)" }}>
          {tt("home.addDistrict")}
        </div>
        <div className="flex max-h-[44dvh] flex-col gap-2 overflow-y-auto pe-1">
          {DISTRICTS.map((d) => (
            <OptionCard
              key={d.slug}
              icon={MapPin}
              selected={d.slug === district}
              onClick={() => setDistrict(d.slug)}
            >
              {d[nameField]}
            </OptionCard>
          ))}
        </div>
      </div>

      {/* Confirm */}
      <PrimaryButton onClick={onConfirm}>{tt("home.addConfirm")}</PrimaryButton>
    </>
  );
}

