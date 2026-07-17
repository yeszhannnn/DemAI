import { LucideIcon, MapPin } from "lucide-react";
import { ReactNode } from "react";
import { AccentBlock } from "./AccentBlock";
import { TopoTexture } from "./TopoTexture";

/**
 * LocationCard — DESIGN §4.2. White card --r-card, padding 16.
 * Row 1: 40px circle #EDEFF1 with an icon (home/backpack) + h2 title +
 * a caption/ink-60 line with a 14px map-pin and the district address.
 * Row 2: AccentBlock (below).
 */
export interface LocationCardProps {
  icon: LucideIcon;
  title: string;
  address: string;
  /** AccentBlock content. */
  value: ReactNode;
  unit?: ReactNode;
  verdict?: ReactNode;
  onOpen?: () => void;
  onAccentClick?: () => void;
  className?: string;
}

export function LocationCard({
  icon: Icon,
  title,
  address,
  value,
  unit,
  verdict,
  onOpen,
  onAccentClick,
  className = "",
}: LocationCardProps) {
  return (
    <div
      className={`bg-white shadow-card ${className}`}
      style={{ borderRadius: "var(--r-card)", padding: 16 }}
    >
      {/* Row 1 */}
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 text-left transition-transform duration-150 active:scale-[.98]"
        style={{ border: "none", background: "transparent", padding: 0, cursor: onOpen ? "pointer" : "default" }}
      >
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "#EDEFF1", color: "var(--ink)" }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-h2 text-ink leading-[24px] truncate">{title}</div>
          <div className="flex items-center gap-1 text-caption leading-[18px] truncate" style={{ color: "var(--ink-60)" }}>
            <MapPin size={14} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>
      </button>

      {/* Row 2: AccentBlock */}
      <div className="mt-3">
        <AccentBlock value={value} unit={unit} verdict={verdict} onClick={onAccentClick} />
      </div>
    </div>
  );
}

/**
 * PeekFade — DESIGN §4.2. The next card peeks ~64px under the current one:
 * bg --card-peek, white texts, with a 40px-tall overlay gradient from
 * transparent to --bg-home on top (the "slides under" fade). Wrap the
 * peeking card content; the fade is rendered as an absolute overlay.
 */
export interface PeekFadeProps {
  children: ReactNode;
  /** CSS background for the fade's bottom stop (defaults to --bg-home). */
  fadeTo?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PeekFade({ children, fadeTo = "var(--bg-home)", className = "", style }: PeekFadeProps) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {children}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: 40,
          background: `linear-gradient(to bottom, ${fadeTo}, rgba(0,0,0,0))`,
        }}
        aria-hidden
      />
    </div>
  );
}

/**
 * LocationCardPeek — DESIGN §4.2. The next card peeking under the current one:
 * bg --card-peek, white texts, carries <TopoTexture tone="light"/>. Reveals
 * the header row plus a ~14px sliver of its own AccentBlock at the bottom
 * edge (the next card's lime block edge, as in the reference). Wrap with
 * <PeekFade> to get the 40px transparent→--bg-home fade on top.
 */
export interface LocationCardPeekProps {
  icon: LucideIcon;
  title: string;
  address: string;
  onOpen?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function LocationCardPeek({
  icon: Icon,
  title,
  address,
  onOpen,
  className = "",
  style,
}: LocationCardPeekProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius: "var(--r-card)",
        background: "var(--card-peek)",
        color: "var(--white)",
        padding: 16,
        ...style,
      }}
    >
      {/* Light topo texture on the slate peek surface */}
      <TopoTexture tone="light" />

      {/* Header row (fades out under PeekFade) */}
      <button
        type="button"
        onClick={onOpen}
        className="relative flex w-full items-center gap-3 text-left transition-transform duration-150 active:scale-[.98]"
        style={{ border: "none", background: "transparent", padding: 0, cursor: onOpen ? "pointer" : "default" }}
      >
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,.22)", color: "var(--white)" }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-h2 text-white leading-[24px] truncate">{title}</div>
          <div className="flex items-center gap-1 text-caption leading-[18px] truncate" style={{ color: "var(--white-70)" }}>
            <MapPin size={14} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>
      </button>

      {/* ~14px sliver of this card's own AccentBlock (lime + ink topo) */}
      <div
        className="relative mt-3 overflow-hidden"
        style={{ height: 14, borderRadius: "var(--r-inner)", background: "var(--lime)" }}
        aria-hidden
      >
        <TopoTexture tone="ink" />
      </div>
    </div>
  );
}

