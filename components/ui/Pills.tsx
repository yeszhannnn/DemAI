import { CSSProperties, ReactNode } from "react";

/**
 * PillBadge — DESIGN §5.2. Compact white pill, chip text (weight 600), used
 * inline as the leading element of the Home H1 ("Сейчас" / "Real-time").
 * h≈26, px 12, r-full, flat (no shadow) so it reads as an inline chip on the
 * heading's first line, not a full-width bar.
 */
export interface PillBadgeProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function PillBadge({ children, className = "", style }: PillBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-white px-3 text-chip text-ink ${className}`}
      style={{ height: 30, ...style }}
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
