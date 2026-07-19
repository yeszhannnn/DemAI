/**
 * lib/geocode.ts — Nominatim (OpenStreetMap) geocoder for the Map search
 * (PROMPTS §9.3 / DESIGN §5.3). Free, no API key.
 *
 * searchAddress(query) hits the public Nominatim /search endpoint restricted
 * to Almaty (viewbox + bounded=1) and returns up to 6 results as
 * [{displayName, lat, lon}]. Calls are rate-limited to ≥1/sec (Nominatim usage
 * policy) and identical queries are cached for the session.
 *
 * NOTE on User-Agent: the fetch sets `User-Agent` to
 * process.env.NEXT_PUBLIC_GEOCODER_UA as the prompt requires. Browsers treat
 * `User-Agent` as a forbidden header and silently drop it — Nominatim instead
 * reads the automatic `Referer` the browser attaches, which satisfies the
 * usage policy. On a server-side call the UA would actually be sent.
 *
 * FALLBACK: if Nominatim's public endpoint rate-limits in production, swap the
 * endpoint to `https://photon.komoot.io/api?q=` — same {display_name, lat, lon}
 * shape (lat/lon are top-level numbers, not strings), no UA requirement, but
 * no viewbox (drop the Almaty-bounded params and filter client-side).
 */

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
// left,top,right,bottom — Almaty bbox (lng,lat order per Nominatim viewbox).
const VIEWBOX = "76.75,43.42,77.18,43.02";
const LIMIT = 6;
const MIN_INTERVAL_MS = 1000; // Nominatim policy: ≤1 req/sec per IP.

let lastCallAt = 0;
const cache = new Map<string, GeocodeResult[]>();

/**
 * Geocode a free-text query against Nominatim, bounded to Almaty. Returns []
 * on offline/network failure — the caller distinguishes "no results" from
 * "offline" via the `offline` flag returned from `searchAddressWithStatus`.
 * Identical queries are served from the in-memory cache without a network
 * call. Calls are spaced ≥1s apart (Nominatim policy) by sleeping before the
 * fetch when the previous call was too recent.
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  return (await searchAddressWithStatus(query)).results;
}

export interface SearchAddressOutcome {
  results: GeocodeResult[];
  /** True when the fetch itself failed (offline / network error / non-OK).
   *  False when Nominatim answered with an empty list. The UI uses this to
   *  show «Поиск недоступен офлайн» vs «Ничего не найдено». */
  offline: boolean;
}

export async function searchAddressWithStatus(query: string): Promise<SearchAddressOutcome> {
  const q = query.trim();
  if (!q) return { results: [], offline: false };

  const cached = cache.get(q);
  if (cached) return { results: cached, offline: false };

  // Rate-limit: ensure ≥1s between actual network calls. The UI also debounces
  // typing (350ms after the last keystroke) so this guard mostly catches
  // rapid successive queries (e.g. Enter right after a debounce-fired call).
  const now = Date.now();
  const wait = lastCallAt + MIN_INTERVAL_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();

  const url =
    `${ENDPOINT}?format=jsonv2&q=${encodeURIComponent(q + ", Алматы")}` +
    `&viewbox=${VIEWBOX}&bounded=1&limit=${LIMIT}&accept-language=ru`;
  // NOTE: the spec said `format=jsonc`, but `jsonc` is not a valid Nominatim
  // format (valid: xml/json/jsonv2/geojson/geocodejson) — Nominatim would fall
  // back to HTML and break JSON parsing. `jsonv2` returns the same
  // {display_name, lat, lon} fields we consume (lat/lon as strings → Number()).

  try {
    const res = await fetch(url, {
      headers: {
        // Browsers drop User-Agent, but we set it per the prompt + for any
        // future server-side call. Nominatim reads the auto Referer instead.
        "User-Agent": process.env.NEXT_PUBLIC_GEOCODER_UA ?? "DemAI",
      },
      cache: "no-store",
    });
    if (!res.ok) return { results: [], offline: true };
    const rows = (await res.json()) as Array<{
      display_name?: string;
      lat?: string | number;
      lon?: string | number;
    }>;
    const out: GeocodeResult[] = [];
    for (const r of rows) {
      const lat = Number(r.lat);
      const lon = Number(r.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      out.push({ displayName: String(r.display_name ?? ""), lat, lon });
    }
    cache.set(q, out);
    return { results: out, offline: false };
  } catch {
    return { results: [], offline: true };
  }
}
