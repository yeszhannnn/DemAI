import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * ForecastBars — DESIGN §4.5. Slate card (--r-card), padding 20.
 * Title h2/white + 36px white/22 circle with white arrow-up-right.
 * Y axis: 2·4·6·8·10 caption/white-70 on the left.
 * Bars: width 10, gap 6, --r-full, height = risk/10 of 96px (min 8);
 * each bar's color is interpolated along the --risk-* ramp by VALUE (low→mid
 * →high→severe), so the row reads green→orange by height like the reference.
 * Selected bar: diagonal hatching over base color + glass tooltip chip above.
 * Selection is tap-driven: the tooltip + hatch appear ONLY on the tapped bar
 * (no default selection on load → no hatching on unselected bars). Pure
 * CSS/divs — no chart lib.
 */
export interface ForecastBar {
  hour: string; // e.g. "15:00"
  day?: string; // e.g. "сб"
  risk: number; // 1..10
}

export interface ForecastBarsProps {
  bars: ForecastBar[];
  /** Initial selected bar index (current hour). 0/undefined → none on load. */
  selectedIndex?: number;
  title?: string;
  onOpen?: () => void;
  onSelect?: (i: number) => void;
  className?: string;
}

const MAX_BAR_PX = 96;
const MIN_BAR_PX = 8;
const AXIS = [10, 8, 6, 4, 2];
const BAR_W = 10;
const BAR_GAP = 6;
const STEP = BAR_W + BAR_GAP; // 16
const CHIP_W = 132;
const CHIP_H = 28; // approx chip height (6px+6px padding + ~16px line)

// --risk-* stops (DESIGN §1.3): low/mid/high/severe tokens. Piecewise-linear
// RGB interpolation by value 1..10 → lime→yellow→orange→red. The RGB tuples
// mirror the --risk-* CSS variables 1:1 (kept as numbers so the chart can
// interpolate without parsing hex at runtime).
const RAMP: Array<[number, number, number, number]> = [
  [1, 191, 233, 92],
  [4, 246, 210, 78],
  [7, 240, 154, 62],
  [9, 232, 96, 60],
];

function riskRampColor(risk: number): string {
  const r = Math.max(1, Math.min(10, risk));
  for (let i = 0; i < RAMP.length - 1; i++) {
    const [t0, r0, g0, b0] = RAMP[i];
    const [t1, r1, g1, b1] = RAMP[i + 1];
    if (r >= t0 && r <= t1) {
      const f = t1 === t0 ? 0 : (r - t0) / (t1 - t0);
      const rr = Math.round(r0 + (r1 - r0) * f);
      const gg = Math.round(g0 + (g1 - g0) * f);
      const bb = Math.round(b0 + (b1 - b0) * f);
      return `rgb(${rr},${gg},${bb})`;
    }
  }
  return "rgb(232,96,60)";
}

export function ForecastBars({
  bars,
  selectedIndex,
  title = "Прогноз риска",
  onOpen,
  onSelect,
  className = "",
}: ForecastBarsProps) {
  // Selection is tap-driven. 0/undefined → no selection on load (no hatch, no
  // tooltip) until the user taps a bar.
  const [selected, setSelected] = useState<number | null>(
    selectedIndex && selectedIndex > 0 ? selectedIndex : null,
  );
  const selBar = selected != null ? bars[selected] : undefined;

  function handleSelect(i: number) {
    setSelected(i);
    onSelect?.(i);
  }

  // Tooltip anchor: center on the selected bar, clamp inside the bars area
  // horizontally; vertically sit just above the bar but never rise above the
  // chart area (so it never overlaps the title row).
  const barsWidth = bars.length * STEP - BAR_GAP;
  const selH = selBar ? Math.max(MIN_BAR_PX, (selBar.risk / 10) * MAX_BAR_PX) : 0;
  const center = selected != null ? selected * STEP + BAR_W / 2 : 0;
  const left = selBar
    ? Math.max(0, Math.min(center - CHIP_W / 2, barsWidth - CHIP_W))
    : 0;
  // bottom (px from bars-row bottom): just above the bar, clamped so the chip
  // top stays within the 96px chart area (never enters the title gap).
  const bottom = selBar ? Math.min(selH + 6, MAX_BAR_PX - CHIP_H) : 0;

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

        {/* Bars row (also the tooltip's positioning context) */}
        <div className="relative flex-1" style={{ height: MAX_BAR_PX }}>
          {/* Tooltip chip for the selected bar — z-index above bars, clamped to
              the chart area so it never overlaps the title. */}
          {selBar ? (
            <div
              className="absolute"
              style={{
                left,
                bottom,
                width: CHIP_W,
                zIndex: 5,
                borderRadius: "var(--r-chip)",
                background: "rgba(255,255,255,.24)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                padding: "6px 10px",
                pointerEvents: "none",
              }}
            >
              <span className="text-chip text-white whitespace-nowrap">
                {`${selBar.risk}/10 · ${selBar.day ?? ""} ${selBar.hour}`.trim()}
              </span>
            </div>
          ) : null}
          <div className="flex items-end" style={{ height: MAX_BAR_PX, gap: BAR_GAP }}>
            {bars.map((b, i) => {
              const h = Math.max(MIN_BAR_PX, (b.risk / 10) * MAX_BAR_PX);
              const isSel = i === selected;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(i)}
                  aria-label={`${b.day ?? ""} ${b.hour}: риск ${b.risk}/10`}
                  className="relative transition-transform duration-150 active:scale-[.98]"
                  style={{
                    width: BAR_W,
                    height: h,
                    borderRadius: "var(--r-full)",
                    background: riskRampColor(b.risk),
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
