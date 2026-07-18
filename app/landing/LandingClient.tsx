"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Flower2, Gauge, HeartPulse, type LucideIcon } from "lucide-react";
import { PrimaryButton } from "@/components/ui/Onboarding";
import { LocalePill } from "@/components/ui/LocalePill";
import { TopoTexture } from "@/components/ui/TopoTexture";
import { useT } from "@/lib/i18n";

/**
 * Landing — DESIGN §5.5 (pre-onboarding). Rendered by `/` when no complete
 * profile exists; a complete profile redirects straight to Detail (the guard
 * lives in app/page.tsx).
 *
 * Background --bg-home. Mini TopBar (lime «D» logo circle + «DemAI» wordmark
 * h2/white, glass LocalePill top-right) → H1 white headline → sub body/white-70
 * → a decorative AccentBlock-style lime blob («7/10» + 2-line verdict, topo
 * texture, non-interactive) → full-width lime CTA «Начать» + caption → three
 * mini feature cards (white, r-inner, shadow-soft, icon circle + chip/600
 * title) → footer medical disclaimer.
 *
 * Entrance: staggered fade-up per §7 (240ms, 60ms stagger) via the
 * `.landing-enter` utility + inline `animationDelay`. All tappables use the
 * shared `.tappable` hover/press states. Mobile-first inside the 430px Screen
 * wrapper; designed to read complete with zero scroll on ~840px viewport
 * height (feature cards may sit below the fold gracefully).
 */

/** Staggered entrance helper: returns an inline style with the nth delay. */
function enter(delaySteps: number): React.CSSProperties {
  return { animationDelay: `${delaySteps * 60}ms` };
}

export function LandingClient() {
  const router = useRouter();
  const t = useT();

  function start() {
    router.push("/onboarding");
  }

  return (
    <div
      className="flex w-full justify-center"
      style={{ minHeight: "100dvh", background: "var(--bg-page)" }}
    >
      <div
        className="relative w-full max-w-[430px] px-5"
        style={{ minHeight: "100dvh", background: "var(--bg-home)" }}
      >
        <div className="flex flex-col gap-5 pt-6 pb-10">
          <TopBar />

          <section className="landing-enter" style={enter(1)}>
            <h1
              className="text-white"
              style={{
                fontSize: 34,
                lineHeight: "40px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {t("landing.h1")}
            </h1>
            <p
              className="mt-3 text-body"
              style={{ color: "var(--white-70)", maxWidth: "40ch" }}
            >
              {t("landing.sub")}
            </p>
          </section>

          <DemoBlob className="landing-enter" style={enter(2)} />

          <section
            className="landing-enter"
            // gap-5 (20px) already separates siblings; +8px → 28px total so the
            // lime CTA never reads as one stack with the lime blob above it.
            style={{ marginTop: 8, ...enter(3) }}
          >
            <PrimaryButton
              onClick={start}
              icon={ArrowRight}
              floating
              fontWeight={700}
              className="landing-cta"
            >
              {t("landing.start")}
            </PrimaryButton>
            <p
              className="mt-2 text-center text-caption"
              style={{ color: "var(--white-70)" }}
            >
              {t("landing.ctaCaption")}
            </p>
          </section>

          <section className="landing-enter flex flex-col gap-3" style={enter(4)}>
            <FeatureCard
              icon={Gauge}
              title={t("landing.feature.risk")}
            />
            <FeatureCard
              icon={Flower2}
              title={t("landing.feature.pollen")}
            />
            <FeatureCard
              icon={HeartPulse}
              title={t("landing.feature.threshold")}
            />
          </section>

          <footer
            className="landing-enter pt-2 text-center text-caption"
            style={{ color: "var(--white-70)", ...enter(5) }}
          >
            {t("detail.disclaimer")}
          </footer>
        </div>
      </div>
    </div>
  );
}

/** Mini TopBar — lime «D» logo circle (44) + «DemAI» wordmark h2/white, glass
 *  LocalePill top-right. The logo is a static wordmark (no tap target). */
function TopBar() {
  const t = useT();
  return (
    <div className="landing-enter flex items-center justify-between gap-3" style={enter(0)}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 44,
            height: 44,
            background: "var(--lime)",
            color: "var(--ink)",
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          D
        </span>
        <h2 className="text-h2 text-white">{t("app.name")}</h2>
      </div>
      <LocalePill ariaLabel={t("landing.localeAria")} />
    </div>
  );
}

/**
 * DemoBlob — DESIGN §5.5. A static, decorative AccentBlock-style lime shape
 * (bg --lime, --r-inner, topo texture tone="ink") with the num-card «7» + unit
 * «/10» on the left and a 2-line ink-40 verdict on the right. Non-interactive:
 * a div with aria-hidden, no hover/press. Mirrors AccentBlock's anatomy (§4.3)
 * exactly, minus the button semantics.
 *
 * Visual hierarchy (landing): the blob is a SOFT decorative preview, never the
 * loudest lime element — the CTA «Начать» is. So the fill is --lime at 55%
 * opacity over the --bg-home gradient (the page shows through, mixing toward a
 * muted lime/slate), the shape is shrunk ~15% vs the AccentBlock, and there is
 * no shadow. Topo lines stay. Reads as quiet decoration, clearly non-interactive.
 */
function DemoBlob({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = useT();
  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        background: "rgba(234, 252, 95, 0.72)",
        borderRadius: "var(--r-inner)",
        padding: "14px 18px",
        minHeight: 82,
        ...style,
      }}
    >
      <TopoTexture tone="ink" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-num-card text-ink leading-none">7</span>
          <span
            className="text-unit text-ink"
            style={{ alignSelf: "flex-start", marginTop: 4 }}
          >
            {t("unit.risk")}
          </span>
        </div>
        <p
          className="max-w-[55%] text-right text-body leading-[22px] line-clamp-2"
          style={{ color: "var(--ink-40)" }}
        >
          {t("verdict.high")}
        </p>
      </div>
    </div>
  );
}

/** FeatureCard — §5.5 mini feature card. White, --r-inner, --shadow-soft,
 *  a 40px icon circle (--icon-bg, ink icon) + a chip/600 single-line title. */
function FeatureCard({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div
      className="flex items-center gap-3 bg-white"
      style={{
        borderRadius: "var(--r-inner)",
        padding: "14px 16px",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, background: "var(--icon-bg)", color: "var(--ink)" }}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="text-chip text-ink" style={{ fontWeight: 600 }}>
        {title}
      </span>
    </div>
  );
}
