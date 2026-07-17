import { ReactNode } from "react";

/**
 * PillBadge — DESIGN §5.2. White pill, chip text. Used inline with the
 * Home H1 ("Сейчас" / "Live"). Floats on slate via --shadow-card.
 */
export interface PillBadgeProps {
  children: ReactNode;
  className?: string;
}

export function PillBadge({ children, className = "" }: PillBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-white px-3 py-1 text-chip text-ink shadow-card ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * GlassPill — DESIGN §5.2 / §1.2. Light-glass pill (bg-white/20 + blur)
 * with white chip text. e.g. "Мои места ⌄".
 */
export interface GlassPillProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassPill({ children, className = "", onClick }: GlassPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-chip text-white transition-transform duration-150 active:scale-[.98] ${className}`}
      style={{
        background: "var(--glass-light)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {children}
    </button>
  );
}
