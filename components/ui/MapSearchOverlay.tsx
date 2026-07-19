"use client";

/**
 * MapSearchOverlay — DESIGN §5.3 / PROMPTS §9.3. The Map screen's address
 * search (Nominatim / OpenStreetMap, free, no API key).
 *
 * Anatomy (mirrors the Home SearchOverlay, but async + map-specific):
 *   - backdrop dims the map (rgba(33,33,33,.40) + 6px blur), tap closes;
 *   - a white pill search field (r-full, shadow-soft) slides down from the top
 *     (fade + translateY, 200ms ease-out), autofocus, lucide `search` left,
 *     `x` clear/close right;
 *   - results render as a dropdown list of rows (lucide `map-pin` + the
 *     result's `displayName` as a caption-style line, truncated);
 *   - debounced typing (350ms after the last keystroke) calls `searchAddress`;
 *     a small skeleton shows while the fetch is in flight;
 *   - empty states: «Ничего не найдено» when Nominatim answered with 0 results,
 *     «Поиск недоступен офлайн» when the fetch itself failed (offline).
 *
 * Keyboard: Enter selects the first result; Esc closes. Backdrop tap and the x
 * close the overlay. i18n RU + KK (//REVIEW on KK). The overlay is always
 * mounted and driven purely by CSS on `open` (no pop) — same pattern as the
 * Home SearchOverlay.
 *
 * The parent (MapClient) owns the flyTo + pin + point-in-polygon logic; this
 * component only reports the picked GeocodeResult via `onSelect`.
 */
import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { searchAddressWithStatus, type GeocodeResult } from "@/lib/geocode";

const DURATION = 200;
const EASING = "cubic-bezier(.32,.72,.29,.99)";
const TYPE_DEBOUNCE_MS = 350;

export interface MapSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelect: (result: GeocodeResult) => void;
}

export function MapSearchOverlay({ open, onClose, onSelect }: MapSearchOverlayProps) {
  const tt = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [touched, setTouched] = useState(false); // has a search been fired?
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  // Reset accumulated state when `open` flips to true (React's "adjust state
  // during render on prop change" pattern — avoids setState-in-effect). A
  // reopen is always fresh; the autofocus is a real side effect, handled in
  // the effect below.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setOffline(false);
      setTouched(false);
    }
  }

  // Autofocus on open (pure side effect — no setState). Waits a tick so the
  // field is mounted + visible before focusing.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
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

  // Debounced Nominatim search on typing. Each keystroke resets the timer;
  // the search fires TYPE_DEBOUNCE_MS after the last keystroke. A monotonically
  // increasing reqId guards against out-of-order responses so a slow earlier
  // fetch can't overwrite a faster later one. The empty-query case is handled
  // purely in render (no setState in the effect body). setLoading is called
  // from inside the timer callback (not synchronously in the effect) so the
  // skeleton shows during the fetch itself.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q) return;
    const myReq = ++reqIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      if (myReq !== reqIdRef.current) return; // stale
      setLoading(true);
      const { results: r, offline: off } = await searchAddressWithStatus(q);
      if (myReq !== reqIdRef.current) return; // stale after await
      setResults(r);
      setOffline(off);
      setLoading(false);
      setTouched(true);
    }, TYPE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  function openFirst(): void {
    const first = results[0];
    if (first) onSelect(first);
  }

  function onFieldKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      openFirst();
    }
  }

  function pick(r: GeocodeResult): void {
    onSelect(r);
  }

  const showEmpty = touched && !loading && results.length === 0 && !offline;
  const showOffline = touched && !loading && offline && results.length === 0;

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
              placeholder={tt("map.search.placeholder")}
              aria-label={tt("map.search.aria.open")}
              className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none"
              style={{ border: "none", padding: 0 }}
            />
            {query ? (
              <button
                type="button"
                aria-label={tt("map.search.aria.clear")}
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
                aria-label={tt("map.search.aria.close")}
                onClick={onClose}
                className="tappable inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--icon-bg)", border: "none", cursor: "pointer", color: "var(--ink)" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Results / skeleton / empty states — slide in with the field. */}
        <div
          className="mt-3 flex flex-col gap-2"
          style={{
            transform: open ? "translateY(0)" : "translateY(-12px)",
            opacity: open ? 1 : 0,
            transition: `transform ${DURATION}ms ${EASING}, opacity ${DURATION}ms ${EASING}`,
          }}
        >
          {loading ? (
            <SkeletonRows />
          ) : showOffline ? (
            <EmptyState text={tt("map.search.offline")} />
          ) : showEmpty ? (
            <EmptyState text={tt("map.search.empty")} />
          ) : (
            results.map((r, i) => (
              <MapSearchRow key={`${r.lat},${r.lon}-${i}`} result={r} onClick={() => pick(r)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-4 py-6 text-center"
      style={{ color: "var(--ink-60)" }}
    >
      <div className="text-body text-ink">{text}</div>
    </div>
  );
}

/** Three shimmering skeleton rows while the geocoder is in flight. */
function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-white"
          style={{
            borderRadius: "var(--r-card)",
            padding: 16,
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <span
            className="inline-flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "var(--icon-bg)" }}
          />
          <div className="flex flex-1 flex-col gap-2">
            <span
              style={{
                height: 12,
                width: "70%",
                borderRadius: "var(--r-full)",
                background: "var(--icon-bg)",
              }}
            />
            <span
              style={{
                height: 10,
                width: "45%",
                borderRadius: "var(--r-full)",
                background: "var(--icon-bg)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A result row: lime map-pin circle + the displayName caption, truncated. */
function MapSearchRow({ result, onClick }: { result: GeocodeResult; onClick: () => void }) {
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
        style={{ width: 40, height: 40, background: "var(--lime)", color: "var(--ink)" }}
      >
        <MapPin size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-caption leading-[18px] truncate"
          style={{ color: "var(--ink-60)" }}
        >
          {result.displayName}
        </div>
      </div>
    </button>
  );
}
