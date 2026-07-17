import { ArrowUpRight } from "lucide-react";
import { bandForRisk } from "./VerdictChip";

/**
 * ForecastBars — DESIGN §4.5. Slate card (--r-card), padding 20.
 * Title h2/white + 36px white/22 circle with white arrow-up-right.
 * Y axis: 2·4·6·8·10 caption/white-70 on the left.
 * Bars: width 10, gap 6, --r-full, height = risk/10 of 96px (min 8);
 * each bar's color = its value's --risk-*.
 * Selected bar: diagonal hatching over base color + tooltip chip above.
 * Pure CSS/divs — no chart lib.
 */
export interface ForecastBar {
  hour: string; // e.g. "15:00"
  day?: string; // e.g. "сб"
  risk: number; // 1..10
}

export interface ForecastBarsProps {
  bars: ForecastBar[];
  selectedIndex?: number;
  title?: string;
  onOpen?: () => void;
  onSelect?: (i: number) => void;
  className?: string;
}

const MAX_BAR_PX = 96;
const MIN_BAR_PX = 8;
const AXIS = [10, 8, 6, 4, 2];

function riskToColor(risk: number): string {
  return bandForRisk(risk).bg;
}

export function ForecastBars({
  bars,
  selectedIndex,
  title = "Прогноз риска",
  onOpen,
  onSelect,
  className = "",
}: ForecastBarsProps) {
  const selected = typeof selectedIndex === "number" ? bars[selectedIndex] : undefined;
  return (
    <div
      className={`relative flex flex-col ${className}`}
      style={{
        background: "var(--slate)",
        borderRadius: "var(--r-card)",
        padding: 20,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h2 text-white">{title}</h2>
        <button
          type="button"
          onClick={onOpen}
          aria-label="Открыть прогноз"
          className="inline-flex items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-[.98]"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,.22)", border: "none", padding: 0, cursor: onOpen ? "pointer" : "default" }}
        >
          <ArrowUpRight size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Chart body: axis + bars */}
      <div className="mt-4 flex gap-2">
        {/* Y axis labels */}
        <div className="flex flex-col justify-between" style={{ height: MAX_BAR_PX, paddingTop: 2, paddingBottom: 2 }}>
          {AXIS.map((v) => (
            <span key={v} className="text-caption leading-none" style={{ color: "var(--white-70)" }}>
              {v}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="relative flex-1">
          {/* Tooltip for selected bar */}
          {selected ? (
            <SelectedTooltip index={selectedIndex!} bar={selected} count={bars.length} />
          ) : null}
          <div className="flex items-end" style={{ height: MAX_BAR_PX, gap: 6 }}>
            {bars.map((b, i) => {
              const h = Math.max(MIN_BAR_PX, (b.risk / 10) * MAX_BAR_PX);
              const isSel = i === selectedIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect?.(i)}
                  aria-label={`${b.day ?? ""} ${b.hour}: риск ${b.risk}/10`}
                  className="relative transition-transform duration-150 active:scale-[.98]"
                  style={{
                    width: 10,
                    height: h,
                    borderRadius: "var(--r-full)",
                    background: riskToColor(b.risk),
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    backgroundImage: isSel
                      ? `repeating-linear-gradient(45deg, rgba(255,255,255,.85) 0 3px, transparent 3px 7px)`
                      : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tooltip chip above the selected bar: bg rgba(255,255,255,.24) + blur 8, --r-chip. */
function SelectedTooltip({ index, bar, count }: { index: number; bar: ForecastBar; count: number }) {
  // Position the tooltip above the selected bar. Bars are 10px wide, gap 6.
  const step = 10 + 6;
  // Center of the selected bar, relative to the bars row (px from left).
  const center = index * step + 5;
  // Keep the chip from overflowing the row edges.
  const chipWidth = 132;
  const maxLeft = count * step - 6 - chipWidth;
  const left = Math.max(0, Math.min(center - chipWidth / 2, maxLeft));
  const text = `${bar.risk}/10 · ${bar.day ?? ""} ${bar.hour}`.trim();
  return (
    <div
      className="absolute"
      style={{
        bottom: MAX_BAR_PX + 8,
        left,
        width: chipWidth,
        borderRadius: "var(--r-chip)",
        background: "rgba(255,255,255,.24)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: "6px 10px",
      }}
    >
      <span className="text-chip text-white whitespace-nowrap">{text}</span>
    </div>
  );
}
