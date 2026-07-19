"use client";

/**
 * SearchOverlay — Home search circle (DESIGN §5.2 / §7).
 *
 * A top-down search modal that filters the user's saved places by name (case-
 * insensitive, RU/KK) and by district nameRu/nameKk. Purely client-side over
 * the local `places` array — no API (PROMPTS §8 acceptance).
 *
 * Anatomy:
 *   - backdrop dims Home (rgba(33,33,33,.40) + 6px blur), tap closes;
 *   - a white pill search field (r-full, shadow-soft) slides down from the top
 *     (fade + translateY, 200ms ease-out), autofocus, lucide `search` left,
 *     `x` clear right;
 *   - results render as LocationCard-style rows (icon + name + district caption)
 *     in a list below the field; §7 hover lift via `.tappable`.
 *
 * Empty states:
 *   - no query yet → all saved places, recent first (places are appended, so
 *     the array order IS recency order);
 *   - query with no match → «Ничего не найдено» + hint «Добавь место на главной»;
 *   - a single «Дом» place still works — the filter runs over whatever exists.
 *
 * Keyboard: Enter opens the first result; Esc closes. Backdrop tap and the x
 * clear/close the overlay. i18n RU + KK (//REVIEW on KK).
 *
 * The sheet is always mounted and driven purely by CSS on `open` (no
 * setState-in-effect, no pop) — same pattern as AddPlaceSheet.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Backpack, Dumbbell, Home, MapPin, Search, X, type LucideIcon } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { getDistrict } from "@/data/districts";
import type { Place } from "@/lib/useProfile";

const DURATION = 200;
const EASING = "cubic-bezier(.32,.72,.29,.99)";

type PresetKey = "place.home" | "place.school" | "place.section";
type LabelT = (k: PresetKey) => string;

function placeIcon(label: string, t: LabelT): LucideIcon {
  if (label === t("place.home")) return Home;
  if (label === t("place.school")) return Backpack;
  if (label === t("place.section")) return Dumbbell;
  return MapPin;
}

function districtName(slug: string, locale: "ru" | "kk"): string {
  const d = getDistrict(slug);
  return d ? (locale === "kk" ? d.nameKk : d.nameRu) : slug;
}

export interface SearchOverlayProps {
  open: boolean;
  places: Place[];
  onClose: () => void;
  onSelect: (districtSlug: string) => void;
}

export function SearchOverlay({ open, places, onClose, onSelect }: SearchOverlayProps) {
  const tt = useT();
  const [locale] = useLocale();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when opening; clear the query on close so a reopen is fresh.
  useEffect(() => {
    if (open) {
      setQuery("");
      // Wait a tick so the field is mounted + visible before focusing.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Esc closes (works whether or not the field has focus).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo<Place[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places; // no query → all saved places, recent first
    return places.filter((p) => {
      if (p.label.toLowerCase().includes(q)) return true;
      const d = getDistrict(p.district);
      if (d) {
        if (d.nameRu.toLowerCase().includes(q)) return true;
        if (d.nameKk.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [query, places]);

  function openFirst(): void {
    const first = results[0];
    if (first) onSelect(first.district);
  }

  function onFieldKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      openFirst();
    }
  }

  function pick(slug: string): void {
    onSelect(slug);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center"
      aria-hidden={!open}
      inert={!open}
      style={{
        background: "rgba(33,33,33,.40)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: `opacity ${DURATION}ms ${EASING}`,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px]"
        style={{ padding: "16px 20px 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search field — slides down from the top (fade + translateY, 200ms). */}
        <div
          style={{
            transform: open ? "translateY(0)" : "translateY(-12px)",
            opacity: open ? 1 : 0,
            transition: `transform ${DURATION}ms ${EASING}, opacity ${DURATION}ms ${EASING}`,
          }}
        >
          <div
            className="flex items-center gap-2 bg-white"
            style={{
              borderRadius: "var(--r-full)",
              boxShadow: "var(--shadow-soft)",
              padding: "10px 14px",
            }}
          >
            <Search size={20} strokeWidth={2} className="shrink-0" style={{ color: "var(--ink)" }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onFieldKeyDown}
              placeholder={tt("search.placeholder")}
              aria-label={tt("search.aria.open")}
              className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none"
              style={{ border: "none", padding: 0 }}
            />
            {query ? (
              <button
                type="button"
                aria-label={tt("search.aria.clear")}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="tappable inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--icon-bg)", border: "none", cursor: "pointer", color: "var(--ink)" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                aria-label={tt("search.aria.close")}
                onClick={onClose}
                className="tappable inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--icon-bg)", border: "none", cursor: "pointer", color: "var(--ink)" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Results list — LocationCard-style rows (icon + name + district caption). */}
        <div
          className="mt-3 flex flex-col gap-2"
          style={{
            transform: open ? "translateY(0)" : "translateY(-12px)",
            opacity: open ? 1 : 0,
            transition: `transform ${DURATION}ms ${EASING}, opacity ${DURATION}ms ${EASING}`,
          }}
        >
          {results.length === 0 ? (
            <div
              className="flex flex-col items-center gap-1 px-4 py-6 text-center"
              style={{ color: "var(--ink-60)" }}
            >
              <div className="text-body text-ink">{tt("search.empty")}</div>
              <div className="text-caption">{tt("search.hint")}</div>
            </div>
          ) : (
            results.map((p) => (
              <SearchRow
                key={p.id}
                icon={placeIcon(p.label, tt)}
                title={p.label}
                address={districtName(p.district, locale)}
                onClick={() => pick(p.district)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** SearchRow — LocationCard-style row (icon + name + district caption).
 *  White card, --r-card, padding 16; §7 hover via `.tappable`. */
function SearchRow({
  icon: Icon,
  title,
  address,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  address: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tappable flex w-full items-center gap-3 bg-white text-left"
      style={{
        borderRadius: "var(--r-card)",
        padding: 16,
        border: "none",
        cursor: "pointer",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, background: "var(--icon-bg)", color: "var(--ink)" }}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-h2 text-ink leading-[24px] truncate">{title}</div>
        <div
          className="flex items-center gap-1 text-caption leading-[18px] truncate"
          style={{ color: "var(--ink-60)" }}
        >
          <MapPin size={14} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      </div>
    </button>
  );
}
