import { Screen } from "@/components/Screen";
import { Swatches } from "@/components/ui/Swatches";

const GLYPHS = "ә ғ қ ң ө ұ ү һ і Ә Ғ Қ Ң Ө Ұ Ү Һ І 0123456789";

const SCALE: { token: string; cls: string; spec: string }[] = [
  { token: "num-hero", cls: "text-num-hero", spec: "64 / 68 · 600" },
  { token: "num-card", cls: "text-num-card", spec: "44 / 48 · 600" },
  { token: "num-metric", cls: "text-num-metric", spec: "34 / 38 · 600" },
  { token: "h1", cls: "text-h1", spec: "34 / 40 · 500" },
  { token: "h2", cls: "text-h2", spec: "18 / 24 · 600" },
  { token: "body", cls: "text-body", spec: "15 / 22 · 500" },
  { token: "caption", cls: "text-caption", spec: "13 / 18 · 500" },
  { token: "unit", cls: "text-unit", spec: "12 / 14 · 600" },
  { token: "chip", cls: "text-chip", spec: "13 / 16 · 600" },
];

export default function GlyphsPage() {
  return (
    <Screen>
      <div className="flex flex-col gap-8 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 text-ink">Glyphs &amp; tokens</h1>
          <p className="text-caption" style={{ color: "var(--ink-60)" }}>
            Onest — Kazakh Cyrillic + numerals across the full type scale.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2 text-ink">Type scale</h2>
          <div className="flex flex-col gap-3">
            {SCALE.map((s) => (
              <div
                key={s.token}
                className="rounded-chip bg-white p-4 shadow-card"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-caption text-ink">{s.token}</span>
                  <span
                    className="text-unit"
                    style={{ color: "var(--ink-60)" }}
                  >
                    {s.spec}
                  </span>
                </div>
                <p className={`${s.cls} text-ink break-words`}>{GLYPHS}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2 text-ink">Core &amp; derived colors</h2>
          <Swatches />
        </section>
      </div>
    </Screen>
  );
}
