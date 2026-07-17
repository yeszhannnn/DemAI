/**
 * VerdictChip — DESIGN §6 verdict table. Maps risk 1–10 to a label and a
 * --risk-* background; text is always --ink. Pill shape (--r-full).
 */
export interface VerdictChipProps {
  risk: number;
  className?: string;
}

type Band = { min: number; max: number; label: string; bg: string };

const BANDS: Band[] = [
  { min: 1, max: 3, label: "Низкий риск", bg: "var(--risk-low)" },
  { min: 4, max: 6, label: "Средний риск", bg: "var(--risk-mid)" },
  { min: 7, max: 8, label: "Высокий риск", bg: "var(--risk-high)" },
  { min: 9, max: 10, label: "Очень высокий", bg: "var(--risk-severe)" },
];

export function bandForRisk(risk: number): Band {
  const r = Math.max(1, Math.min(10, Math.round(risk)));
  return BANDS.find((b) => r >= b.min && r <= b.max) ?? BANDS[0];
}

export function VerdictChip({ risk, className = "" }: VerdictChipProps) {
  const band = bandForRisk(risk);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-chip text-ink ${className}`}
      style={{ background: band.bg }}
    >
      {band.label}
    </span>
  );
}
