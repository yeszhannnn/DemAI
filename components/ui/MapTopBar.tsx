import { LocateFixed, Search } from "lucide-react";
import { IconCircle } from "./IconCircle";

/**
 * MapTopBar — DESIGN §4.1 (Map variant), rebuilt to the Airly reference.
 *
 * ONE wide glass pill spans the top with 12px side margins (nearly the full
 * screen width), h 56, r-full, --glass-dark + blur 12, top offset 20px. A
 * symmetric 3-column layout inside:
 *   • LEFT  — 44px lime «D» logo circle, flush left with a 6px inset from the
 *     pill's left rim (mirrors the search circle on the right; same size,
 *     same inset).
 *   • CENTER — «Алматы» body/600/white over «Казахстан» caption/white-70, two
 *     lines, horizontally centered between the two circles (flex-1 column,
 *     text-align center).
 *   • RIGHT — the `search` icon in a 44px lighter-glass circle
 *     (rgba(255,255,255,.14)), inset 6px from the pill's right rim.
 *
 * The `locate` glass circle stays a SEPARATE floating button, below the bar on
 * the right (matches the reference).
 *
 * The logo circle is a placeholder (solid --lime, «D» in ink, 700/20) marked
 * // LOGO PLACEHOLDER — swap for the real wordmark slot later.
 */
export interface MapTopBarProps {
  city: string;
  country: string;
  onSearch?: () => void;
  onLocate?: () => void;
}

const CIRCLE_INSET = 6; // px from either rim — symmetric for logo & search

export function MapTopBar({ city, country, onSearch, onLocate }: MapTopBarProps) {
  return (
    <>
      {/* ONE glass pill, 12px side margins, top 20px. */}
      <div
        className="absolute z-20 flex items-center"
        style={{
          left: 12,
          right: 12,
          top: 20,
          height: 56,
          borderRadius: "var(--r-full)",
          background: "var(--glass-dark)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* LEFT — logo, 44px, 6px inset from the left rim. */}
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{
            marginLeft: CIRCLE_INSET,
            width: 44,
            height: 44,
            border: "none",
            padding: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </span>

        {/* CENTER — city + country, two lines, centered between the circles. */}
        <div
          className="flex flex-1 flex-col items-center justify-center leading-none"
          style={{ textAlign: "center" }}
        >
          <span className="text-body text-white" style={{ fontWeight: 600 }}>
            {city}
          </span>
          <span
            className="text-caption"
            style={{ color: "var(--white-70)", marginTop: 2 }}
          >
            {country}
          </span>
        </div>

        {/* RIGHT — embedded search circle, 44px, 6px inset from the right rim. */}
        <button
          type="button"
          aria-label="Поиск"
          onClick={onSearch}
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{
            marginRight: CIRCLE_INSET,
            width: 44,
            height: 44,
            background: "rgba(255,255,255,0.14)",
            color: "var(--white)",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <Search size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Locate — separate floating glass circle, directly below the search
          button. Same 44px size; right edge aligned with the search circle's
          right edge (12px pill margin + 6px inset = 18px from the screen
          edge); top sits just below the search circle's bottom. */}
      <div
        className="absolute z-20"
        style={{ right: 12 + CIRCLE_INSET, top: 20 + 6 + 44 + 19 }}
      >
        <IconCircle
          icon={LocateFixed}
          variant="glassDark"
          size={44}
          aria-label="Моё местоположение"
          onClick={onLocate}
        />
      </div>
    </>
  );
}
