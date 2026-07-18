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
  /** Optional trailing affordance icon (e.g. ArrowRight on the landing CTA). */
  icon?: LucideIcon;
  /** When true, paint --shadow-float so the pill visibly lifts off the page. */
  floating?: boolean;
  /** Override the text-h2 weight (default 600). Landing CTA uses 700. */
  fontWeight?: number;
  /** Extra inline style (merged after defaults so callers can override). */
  style?: React.CSSProperties;
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  disabled,
  icon: Icon,
  floating = false,
  fontWeight,
  style,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tappable tappable--primary w-full rounded-full text-h2 text-ink disabled:opacity-50 ${className}`}
      style={{
        height: 56,
        background: "var(--lime)",
        border: "none",
        padding: "0 20px",
        fontWeight,
        boxShadow: floating ? "var(--shadow-float)" : undefined,
        ...style,
      }}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {children}
        {Icon ? <Icon size={20} strokeWidth={2.5} /> : null}
      </span>
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = "", disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tappable w-full rounded-full bg-white text-h2 text-ink shadow-card disabled:opacity-50 ${className}`}
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
      className={`tappable flex w-full items-center gap-3 ${className}`}
      style={{
        height: 64,
        borderRadius: "var(--r-inner)",
        padding: "0 16px",
        border: selected ? "2px solid var(--ink)" : "2px solid transparent",
        background: selected ? "var(--lime-16)" : "var(--white)",
        boxShadow: selected ? "none" : "var(--shadow-card)",
        cursor: "pointer",
      }}
    >
      {Icon ? (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "var(--icon-bg)", color: "var(--ink)" }}
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

/**
 * ProgressDots — DESIGN §7 (updated). A fixed row of grey dots plus ONE
 * absolutely-positioned lime pill that translateX's to the active slot and
 * morphs width 6↔20px, 260ms cubic-bezier(.32,.72,.29,.99). The pill is the
 * same DOM node across steps (it never unmounts) so the browser interpolates
 * the glide instead of jumping. Under prefers-reduced-motion the transition
 * is zeroed (instant) via the CSS below.
 *
 * Geometry: each dot is 6px, gap is 8px → stride 14px. The active pill is 20px
 * wide, centred on the active dot: pill-left = current·14 − 7.
 */
const DOT = 6;
const GAP = 8;
const STRIDE = DOT + GAP; // 14
const PILL_W = 20;

export function ProgressDots({ total, current, className = "" }: ProgressDotsProps) {
  const pillLeft = current * STRIDE - (PILL_W - DOT) / 2; // centre on active dot
  const rowWidth = total * DOT + (total - 1) * GAP;
  return (
    <div
      className={`relative ${className}`}
      style={{ width: rowWidth, height: DOT }}
      aria-label={`Шаг ${current + 1} из ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: i * STRIDE,
            width: DOT,
            height: DOT,
            borderRadius: "var(--r-full)",
            background: "var(--white)",
            opacity: 0.5,
          }}
        />
      ))}
      {/* The single lime pill — same node across steps; it glides + width-morphs. */}
      <span
        aria-hidden
        data-onb-pill
        className="absolute block"
        style={{
          left: 0,
          top: 0,
          width: PILL_W,
          height: DOT,
          borderRadius: "var(--r-full)",
          background: "var(--lime)",
          transform: `translateX(${pillLeft}px)`,
          transition:
            "transform 260ms cubic-bezier(.32,.72,.29,.99), width 260ms cubic-bezier(.32,.72,.29,.99)",
        }}
      />
    </div>
  );
}

