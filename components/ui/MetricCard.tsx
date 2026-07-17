import { ArrowUpRight, LucideIcon } from "lucide-react";

/**
 * MetricCard — DESIGN §4.4. White card --r-card ~140x120, padding 16.
 * Top: caption name in SOLID --ink, weight 600 (reference labels are
 * near-solid, not muted) + a 32px #EDEFF1 circle with arrow-up-right.
 * Bottom: num-metric value + unit ("µg/m³" or "/5"). Content is exactly
 * label, arrow circle, number, unit — no particle decor in any mode.
 *  - mode "word": a level word renders under the value (pollen cards).
 */
export type MetricCardMode = "unit" | "word";

export interface MetricCardProps {
  name: string;
  value: number | string;
  mode: "unit";
  unit?: string;
  icon?: LucideIcon;
  onOpen?: () => void;
  className?: string;
}

export interface MetricCardWordProps {
  name: string;
  value: number | string;
  mode: "word";
  /** Level word ("высокий"/"умеренный"/"нет"), shown under the value. */
  levelWord: string;
  icon?: LucideIcon;
  onOpen?: () => void;
  className?: string;
}

type Props = MetricCardProps | MetricCardWordProps;

export function MetricCard(props: Props) {
  const { name, value, mode, icon: Icon, onOpen, className = "" } = props;
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-white shadow-card ${className}`}
      style={{
        borderRadius: "var(--r-card)",
        padding: 16,
        width: 140,
        minHeight: 120,
      }}
    >
      {/* Top row: name + open circle */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-caption leading-[18px]" style={{ color: "var(--ink)", fontWeight: 600 }}>
          {name}
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Открыть ${name}`}
          className="inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-[.98]"
          style={{ width: 32, height: 32, background: "#EDEFF1", color: "var(--ink)", border: "none", padding: 0, cursor: onOpen ? "pointer" : "default" }}
        >
          {Icon ? <Icon size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />}
        </button>
      </div>

      {/* Bottom: value + unit */}
      <div className="relative">
        <div className="flex items-baseline gap-1">
          <span className="text-num-metric text-ink leading-none">{value}</span>
          <span className="text-unit text-ink" style={{ alignSelf: "flex-start", marginTop: 2 }}>
            {mode === "unit" ? (props.unit ?? "мкг/м³") : "/5"}
          </span>
        </div>

        {mode === "word" ? (
          <div className="text-caption mt-1 text-ink">{props.levelWord}</div>
        ) : null}
      </div>
    </div>
  );
}
