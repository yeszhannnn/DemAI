import { Check, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/**
 * Onboarding controls — DESIGN §4.7.
 *  - Primary: pill h=56, --lime, h2/ink, full-width.
 *  - Secondary: pill h=56, white + --shadow-card, ink text.
 *  - OptionCard: white card --r-inner h=64, body/ink, icon circle left;
 *    selected -> 2px --ink border + checkmark.
 *  - ProgressDots: five d=6 dots; active = 20x6 lime pill.
 */

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function PrimaryButton({ children, onClick, className = "", disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full text-h2 text-ink transition-transform duration-150 active:scale-[.98] disabled:opacity-50 ${className}`}
      style={{ height: 56, background: "var(--lime)", border: "none", padding: "0 20px" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = "", disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full bg-white text-h2 text-ink shadow-card transition-transform duration-150 active:scale-[.98] disabled:opacity-50 ${className}`}
      style={{ height: 56, border: "none", padding: "0 20px" }}
    >
      {children}
    </button>
  );
}

export interface OptionCardProps {
  children: ReactNode;
  selected?: boolean;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function OptionCard({ children, selected, icon: Icon, onClick, className = "" }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 bg-white transition-transform duration-150 active:scale-[.98] ${className}`}
      style={{
        height: 64,
        borderRadius: "var(--r-inner)",
        padding: "0 16px",
        border: selected ? "2px solid var(--ink)" : "2px solid transparent",
        boxShadow: selected ? "none" : "var(--shadow-card)",
        cursor: "pointer",
      }}
    >
      {Icon ? (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "#EDEFF1", color: "var(--ink)" }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
      ) : null}
      <span className="flex-1 text-left text-body text-ink">{children}</span>
      {selected ? (
        <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: 24, height: 24, background: "var(--ink)", color: "var(--white)" }}>
          <Check size={16} strokeWidth={2.5} />
        </span>
      ) : null}
    </button>
  );
}

export interface ProgressDotsProps {
  /** Total steps (reference onboarding = 5). */
  total: number;
  /** 0-based active index. */
  current: number;
  className?: string;
}

export function ProgressDots({ total, current, className = "" }: ProgressDotsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label={`Шаг ${current + 1} из ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        return (
          <span
            key={i}
            className="block"
            style={
              active
                ? { width: 20, height: 6, borderRadius: "var(--r-full)", background: "var(--lime)" }
                : { width: 6, height: 6, borderRadius: "var(--r-full)", background: "var(--white)" }
            }
          />
        );
      })}
    </div>
  );
}
