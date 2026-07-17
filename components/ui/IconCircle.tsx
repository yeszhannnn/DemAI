import { LucideIcon } from "lucide-react";
import { CSSProperties } from "react";

/**
 * IconCircle — DESIGN §3.4. Round icon container, d=44 by default.
 * The only sanctioned hex literal in components is #EDEFF1 (the light
 * surface token from §3.4); every other visual value comes from a CSS
 * variable or Tailwind token so the design-grep stays clean.
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
  light: { bg: "#EDEFF1", color: "var(--ink)", blur: false },
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-[.98] disabled:cursor-default ${className}`}
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
