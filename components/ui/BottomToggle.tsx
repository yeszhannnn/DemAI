import { Grip, Map, LucideIcon } from "lucide-react";

/**
 * BottomToggle — DESIGN §4.6. White pill h=56, --shadow-float, fixed
 * bottom-center. Two icon segments; active = 44px black circle with a
 * white icon, inactive = --ink icon on white. Icons: map / grip.
 */
export type BottomToggleActive = "map" | "list";

export interface BottomToggleProps {
  active: BottomToggleActive;
  onChange?: (active: BottomToggleActive) => void;
  className?: string;
}

const SEGMENTS: { key: BottomToggleActive; icon: LucideIcon; label: string }[] = [
  { key: "map", icon: Map, label: "Карта" },
  { key: "list", icon: Grip, label: "Список" },
];

export function BottomToggle({ active, onChange, className = "" }: BottomToggleProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div
        className="flex items-center gap-1 rounded-full bg-white p-1 shadow-float"
        style={{ height: 56 }}
      >
        {SEGMENTS.map((s) => {
          const isActive = s.key === active;
          if (isActive) {
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange?.(s.key)}
                aria-label={s.label}
                aria-pressed
                className="inline-flex items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-[.98]"
                style={{ width: 44, height: 44, background: "var(--ink)", border: "none", padding: 0 }}
              >
                <s.icon size={20} strokeWidth={2} />
              </button>
            );
          }
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChange?.(s.key)}
              aria-label={s.label}
              className="inline-flex items-center justify-center rounded-full text-ink transition-transform duration-150 active:scale-[.98]"
              style={{ width: 44, height: 44, background: "transparent", border: "none", padding: 0 }}
            >
              <s.icon size={20} strokeWidth={2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
