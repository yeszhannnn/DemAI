"use client";

/**
 * Home — DESIGN §5.2 / PROMPTS §8. The places list.
 *
 * Background --bg-home. TopBar(home) → a compact white PillBadge «Сейчас» inline
 * at the start of the h1/white «Риски и качество воздуха», sitting on the same
 * baseline as «Риски» (the heading wraps to fill the row width) → LocationCard
 * for the first place (icon home, AccentBlock fed by /api/risk for that district)
 * → peek card for the second place per §4.2 (or a ghost «+ Добавить место» card
 * if there is only one) → BottomToggle fixed bottom-center (list active, map →
 * /map). Card tap → /d/[district]. The add-place bottom sheet slides up (§7)
 * from the ghost card or the empty state. No «Мои места» control on Home.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Backpack, Dumbbell, Home, MapPin, Plus, type LucideIcon } from "lucide-react";
import { TopBar } from "@/components/ui/TopBar";
import { PillBadge } from "@/components/ui/Pills";
import {
  LocationCard,
  LocationCardPeek,
  PeekFade,
} from "@/components/ui/LocationCard";
import { BottomToggle } from "@/components/ui/BottomToggle";
import { TopoTexture } from "@/components/ui/TopoTexture";
import { useProfile, type Place } from "@/lib/useProfile";
import { isDemo } from "@/lib/demo";
import { useLocale, useT } from "@/lib/i18n";
import { getDistrict } from "@/data/districts";
import type { RiskResponse } from "@/lib/compose";
import { AddPlaceSheet } from "./AddPlaceSheet";
import { SearchOverlay } from "./SearchOverlay";

type PresetKey = "place.home" | "place.school" | "place.section";
type LabelT = (k: PresetKey) => string;
function placeIcon(label: string, t: LabelT): LucideIcon {
  if (label === t("place.home")) return Home;
  if (label === t("place.school")) return Backpack;
  if (label === t("place.section")) return Dumbbell;
  return MapPin;
}

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function HomePage() {
  const router = useRouter();
  const { places, isComplete, addPlace, setPlaces, hydrated } = useProfile();
  const tt = useT();
  const [locale] = useLocale();
  const demo = isDemo();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Guard: no profile → onboarding (DESIGN §7 returning-user rule). Demo mode
  // is exempt so /home?demo=1 renders standalone without network/onboarding.
  //
  // MUST wait for `hydrated`: on a hard refresh (or an immediate tap of the
  // Detail grid button right after a refresh) the server snapshot is `null`,
  // so `isComplete` is transiently `false`. Without this gate the guard would
  // fire on that stale tick and bounce a complete profile to /onboarding —
  // the "Detail home button sometimes lands on onboarding" race. Only
  // redirect when `hydrated === true AND isComplete === false`.
  useEffect(() => {
    if (!hydrated) return;
    if (!isComplete && !demo) router.replace("/onboarding");
  }, [hydrated, isComplete, demo, router]);

  // Demo self-seed: ensure a «Дом» place exists so the screen renders offline.
  useEffect(() => {
    if (demo && places.length === 0) {
      setPlaces([{ id: newId(), label: tt("place.home"), district: "bostandyk" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, places.length]);

  const first = places[0];
  const second = places[1];

  function openDistrict(slug: string): void {
    router.push(`/d/${encodeURIComponent(slug)}`);
  }

  function openSheet(): void {
    setSheetOpen(true);
  }

  function handleAdd(label: string, district: string): void {
    addPlace({ id: newId(), label, district });
    setSheetOpen(false);
  }

  // Splash until hydration settles (and while a genuine onboarding redirect is
  // in flight). Never paint Home content on a stale snapshot, and never flash
  // onboarding for a complete profile. Demo mode skips the splash so
  // /home?demo=1 paints at once.
  if (!hydrated && !demo) return null;
  if (hydrated && !isComplete && !demo) return null;

  return (
    <div
      className="flex w-full justify-center"
      style={{ minHeight: "100dvh", background: "var(--bg-page)" }}
    >
      <div
        className="relative w-full max-w-[430px] px-5"
        style={{ minHeight: "100dvh", background: "var(--bg-home)" }}
      >
        <div className="flex flex-col gap-4 pt-6 pb-28">
          <TopBar
            variant="home"
            title={tt("app.city")}
            onSearch={() => setSearchOpen(true)}
            onSettings={() => router.push("/settings")}
          />

          {/* Header: [Сейчас pill] inline at the start of the h1's first line,
              on the same baseline as «Риски»; the heading wraps to fill the row
              width like the reference «Air quality data». No «Мои места» control. */}
          <h1
            className="text-white"
            style={{
              fontSize: 42,
              lineHeight: "46px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            <PillBadge style={{ marginRight: 10, verticalAlign: "baseline" }}>
              {tt("badge.now")}
            </PillBadge>
            {tt("home.title")}
          </h1>

          {/* First place — full LocationCard with AccentBlock */}
          {first ? (
            <FirstPlaceCard key={first.id} place={first} demo={demo} onOpen={openDistrict} />
          ) : (
            <EmptyState onAdd={openSheet} />
          )}

          {/* Second place — peek card, or ghost «+ Добавить место» */}
          {first && second ? (
            <PeekFade>
              <LocationCardPeek
                icon={placeIcon(second.label, tt)}
                title={second.label}
                address={districtName(second.district, locale)}
                onOpen={() => openDistrict(second.district)}
              />
            </PeekFade>
          ) : first ? (
            <PeekFade>
              <GhostPeek onAdd={openSheet} />
            </PeekFade>
          ) : null}
        </div>

        {/* Bottom toggle — fixed bottom-center, list active */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex justify-center"
          style={{ pointerEvents: "none" }}
        >
          <div style={{ pointerEvents: "auto" }} className="mx-auto mb-4 w-full max-w-[430px] px-5">
            <BottomToggle
              active="list"
              onChange={(a) => a === "map" && router.push("/map")}
            />
          </div>
        </div>

        <AddPlaceSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onConfirm={handleAdd}
        />

        <SearchOverlay
          open={searchOpen}
          places={places}
          onClose={() => setSearchOpen(false)}
          onSelect={(slug) => {
            setSearchOpen(false);
            openDistrict(slug);
          }}
        />
      </div>
    </div>
  );
}

function districtName(slug: string, locale: "ru" | "kk"): string {
  const d = getDistrict(slug);
  return d ? (locale === "kk" ? d.nameKk : d.nameRu) : slug;
}

/** First place card — fetches /api/risk for its district, feeds AccentBlock.
 *  Shows a skeleton (DESIGN §7) while fetching and falls back to the demo
 *  snapshot with a friendly RU stale note if the live fetch fails (Prompt 12.2). */
function FirstPlaceCard({
  place,
  demo,
  onOpen,
}: {
  place: Place;
  demo: boolean;
  onOpen: (slug: string) => void;
}) {
  const tt = useT();
  const [locale] = useLocale();
  const [data, setData] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStale(false);
    const url = `/api/risk?district=${encodeURIComponent(place.district)}${
      demo ? "&demo=1" : ""
    }`;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: RiskResponse) => {
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      })
      .catch(() => {
        // Friendly fallback (Prompt 12.2): the demo snapshot keeps the card
        // from ever staying empty; a one-line note says the data is stale.
        if (cancelled) return;
        fetch(`/api/risk?district=${encodeURIComponent(place.district)}&demo=1`)
          .then((r) => r.json())
          .then((j: RiskResponse) => {
            if (!cancelled) {
              setData(j);
              setStale(true);
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) setLoading(false);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [place.district, demo]);

  if (loading && !data) {
    return <FirstPlaceSkeleton />;
  }

  const verdict = data
    ? locale === "kk"
      ? data.verdict.textKk
      : data.verdict.textRu
    : "";

  return (
    <div className="flex flex-col gap-2">
      <LocationCard
        icon={placeIcon(place.label, tt)}
        title={place.label}
        address={districtName(place.district, locale)}
        onOpen={() => onOpen(place.district)}
        onAccentClick={() => onOpen(place.district)}
        value={data?.risk ?? ""}
        unit="/10"
        verdict={verdict}
      />
      {stale ? (
        <p
          data-testid="stale-banner"
          className="flex items-center gap-2 px-1 text-caption"
          style={{ color: "var(--white-70)" }}
          role="status"
        >
          {tt("detail.stale")}
        </p>
      ) : null}
    </div>
  );
}

/** FirstPlaceSkeleton — DESIGN §7. A white card shell with a pulsing lime
 *  AccentBlock-shaped block, mirroring the real card's silhouette. */
function FirstPlaceSkeleton() {
  return (
    <div
      className="bg-white shadow-card"
      style={{ borderRadius: "var(--r-card)", padding: 16 }}
      data-testid="section-skeleton"
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <div
          className="animate-pulse shrink-0 rounded-full"
          style={{ width: 40, height: 40, background: "var(--icon-bg)" }}
        />
        <div className="flex flex-col gap-2">
          <div
            className="animate-pulse"
            style={{ height: 18, width: 96, borderRadius: "var(--r-full)", background: "var(--icon-bg)" }}
          />
          <div
            className="animate-pulse"
            style={{ height: 14, width: 140, borderRadius: "var(--r-full)", background: "var(--icon-bg)", opacity: 0.7 }}
          />
        </div>
      </div>
      <div
        className="animate-pulse mt-3"
        style={{ height: 96, borderRadius: "var(--r-inner)", background: "var(--lime)", opacity: 0.18 }}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const tt = useT();
  return (
    <button
      type="button"
      onClick={onAdd}
      className="tappable flex w-full items-center justify-center gap-2 bg-white text-h2 text-ink shadow-card"
      style={{ borderRadius: "var(--r-card)", padding: 20, border: "none", cursor: "pointer" }}
    >
      <Plus size={20} strokeWidth={2} />
      {tt("place.add")}
    </button>
  );
}

/** Ghost peek card — same styling as the peek card (§4.2: --card-peek, white
 * text, light topo texture, ~14px lime sliver), but invites adding a place.
 * The whole card is one tappable (§7 hover lift + press scale .97). */
function GhostPeek({ onAdd }: { onAdd: () => void }) {
  const tt = useT();
  return (
    <button
      type="button"
      onClick={onAdd}
      className="tappable tappable--ghost relative block w-full overflow-hidden text-left"
      style={{
        borderRadius: "var(--r-card)",
        background: "var(--card-peek)",
        color: "var(--white)",
        padding: 16,
        border: "none",
        cursor: "pointer",
      }}
    >
      {/* Light topo texture on the slate peek surface (§4.2) */}
      <TopoTexture tone="light" />

      {/* Header row (fades out under PeekFade) */}
      <div className="relative flex w-full items-center gap-3">
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,.22)", color: "var(--white)" }}
        >
          <Plus size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-h2 text-white leading-[24px] truncate">{tt("place.add")}</div>
        </div>
      </div>

      {/* ~14px sliver of an AccentBlock (lime + ink topo), as on the real peek */}
      <div
        className="relative mt-3 overflow-hidden"
        style={{ height: 14, borderRadius: "var(--r-inner)", background: "var(--lime)" }}
        aria-hidden
      >
        <TopoTexture tone="ink" />
      </div>
    </button>
  );
}
