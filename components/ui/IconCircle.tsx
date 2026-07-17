import { LucideIcon } from "lucide-react";
import { CSSProperties } from "react";

/**
 * IconCircle — DESIGN §3.4. Round icon container, d=44 by default.
 * Every visual value comes from a CSS variable or Tailwind token (the light
 * surface is --icon-bg) so the design-grep stays clean.
 */
export type IconCircleSize = 32 | 36 | 40 | 44;
export type IconCircleVariant = "light" | "glassDark" | "glassLight" | "black" | "white";

export interface IconCircleProps {
  icon: LucideIcon;
  size?: IconCircleSize;
  variant?: IconCircleVariant;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  "aria-label"?: string;
}

const VARIANT_STYLE: Record<IconCircleVariant, { bg: string; color: string; blur: boolean }> = {
  light: { bg: "var(--icon-bg)", color: "var(--ink)", blur: false },
  white: { bg: "var(--white)", color: "var(--ink)", blur: false },
  glassDark: { bg: "var(--glass-dark)", color: "var(--white)", blur: true },
  glassLight: { bg: "var(--glass-light)", color: "var(--white)", blur: true },
  black: { bg: "var(--ink)", color: "var(--white)", blur: false },
};

export function IconCircle({
  icon: Icon,
  size = 44,
  variant = "light",
  className = "",
  style,
  onClick,
  "aria-label": ariaLabel,
}: IconCircleProps) {
  const v = VARIANT_STYLE[variant];
  const iconPx = size <= 32 ? 16 : size <= 36 ? 18 : 20;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center rounded-full disabled:cursor-default ${onClick ? "tappable" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        background: v.bg,
        color: v.color,
        backdropFilter: v.blur ? "blur(12px)" : undefined,
        WebkitBackdropFilter: v.blur ? "blur(12px)" : undefined,
        border: "none",
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <Icon size={iconPx} strokeWidth={2} />
    </button>
  );
}
