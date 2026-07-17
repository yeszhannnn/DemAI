"use client";

/**
 * MapClient — DESIGN §5.3 / PROMPTS §9. Full-screen MapLibre map with a dense
 * field of H3 cell-center dots (Airly-style). The map must NEVER show a blank
 * screen — that rule outranks basemap beauty (DESIGN §5.3).
 *
 *   • LIGHT VECTOR BASEMAP — CARTO positron GL style (free, light, minimal
 *     streets, English/local labels) is set as the map `style` directly. We do
 *     NOT iterate or repaint any of its vector layers — that was the old crash:
 *     iterating a third-party style fed null into a tile-worker filter and
 *     threw "Expected number, found null". The basemap is left untouched; our
 *     `dots` source + circle layers are added ON TOP after 'load'.
 *   • NETWORK-FAIL SAFETY NET — if the positron style does not finish loading
 *     within 6s, OR isDemo(), we swap to LOCAL_STYLE (a single `background`
 *     layer painted with the literal §1.4 `--map-water` hex) so dots still
 *     render offline. setStyle triggers 'style.load', which re-runs the same
 *     ensureDotLayers + applyDotData path (idempotent).
 *   • POINT SOURCE — instead of 8 district centroids (or area fills), we build
 *     a GeoJSON of ~114 POINTS, one at the center of each H3 res-8 cell covering
 *     Almaty (h3 `cellToLatLng` → [lat,lng], flipped to [lng,lat]). Each point
 *     carries {slug, risk, color} inherited from its parent district, so the
 *     dense scatter reads as a risk gradient: green dots over cleaner
 *     districts, orange over dirtier ones — like Airly's many-dot map.
 *   • MARKER STYLE — two stacked `circle` layers, no area fills:
 *       • dot-glow — blurred underlayer (circle-blur, risk color @ 25%,
 *         radius ~12) gives each dot a soft halo so same-color neighbors
 *         cluster into a readable zone without washing out the streets.
 *       • dot-fill — solid dot (risk color, radius ~5, thin white ring) on
 *         top. NON-INTERACTIVE: no click handlers — it's pure decoration +
 *         data glance. Taps fall through to the invisible district layer.
 *   • INTERACTION LAYER ≠ DATA LAYER — an INVISIBLE `district-fill` layer
 *     (the 8 district polygons, fill-opacity 0 but queryable) sits ABOVE the
 *     basemap and BELOW the dots. ALL tap/click handling binds here via
 *     queryRenderedFeatures, so tapping ANY building/street inside a district
 *     opens that district's bottom sheet. Cursor is pointer over the whole
 *     city. A `district-outline` line layer (1.5px --ink @ 0.35, 150ms fade)
 *     briefly highlights the tapped district; its dots also get a small
 *     opacity/radius boost via feature-state so the user sees what they
 *     selected.
 *   • TopBar(map) — MapTopBar: a glass pill (top-left) with a protruding round
 *     logo slot + «Алматы»/«Казахстан»; glass search + locate circles top-right;
 *     ModeSwitch lime capsule (centered below the bar) drives 2D/3D.
 *   • District tap → bottom preview sheet (name + AccentBlock + «Открыть»).
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X } from "lucide-react";
import { MapTopBar } from "@/components/ui/MapTopBar";
import { ModeSwitch, type ModeSwitchValue } from "@/components/ui/ModeSwitch";
import { BottomToggle } from "@/components/ui/BottomToggle";
import { AccentBlock } from "@/components/ui/AccentBlock";
import { PrimaryButton } from "@/components/ui/Onboarding";
import { isDemo } from "@/lib/demo";
import { useLocale, useT } from "@/lib/i18n";
import { verdict as riskVerdict } from "@/lib/risk";
import {
  buildCellPointsGeoJSON,
  pointsBounds,
  type CellPointCollection,
  type CellPointFeature,
  type HexFeatureProps,
  type DistrictFC,
} from "@/lib/hex";

// H3 resolution for the dot field. res-8 yields ~800 cells over Almaty; after
// the deterministic risk-weighted thinning in buildCellPointsGeoJSON
// (p=0.18/0.30/0.45) ~158 dots survive — the dense Airly-style organic scatter.
// Combined with per-dot jitter + size variation, the hex lattice is no longer
// readable. Do NOT lower to 7 (that drops to ~20 dots — too sparse).
const H3_RES = 8;

// DESIGN §1.4 — the map palette is read from CSS custom properties at runtime
// (MapLibre paint properties need literal color strings and cannot resolve
// `var(--*)` themselves, so we resolve them once in the browser and feed
// literals to MapLibre). Every map hex/rgba lives in globals.css as a §1.4
// token; NO color literal appears in this file (the lint:design rule enforces
// that). `readMapPalette()` is called inside the mount effect (DOM is ready,
// CSS loaded) and the resulting palette is threaded through restyleToSlate,
// sanitizePointsFC and the layer paint props.
export interface MapPalette {
  land: string;
  block: string;
  water: string;
  park: string;
  roadMajor: string;
  roadMid: string;
  roadMinor: string;
  labelText: string;
  labelHalo: string;
  boundary: string;
  selectOutline: string;
  riskLow: string;
  riskMid: string;
  riskHigh: string;
  riskSevere: string;
  neutral: string;
  white: string;
}

function readCssVar(name: string): string {
  if (typeof window === "undefined" || !document.documentElement) return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function readMapPalette(): MapPalette {
  const g = (n: string) => readCssVar(n);
  return {
    land: g("--map-land"),
    block: g("--map-land-2"),
    water: g("--map-water"),
    park: g("--map-park"),
    roadMajor: g("--map-road-major"),
    roadMid: g("--map-road-mid"),
    roadMinor: g("--map-road-minor"),
    labelText: g("--map-label-text"),
    labelHalo: g("--map-label-halo"),
    boundary: g("--map-boundary"),
    selectOutline: g("--map-select-outline"),
    riskLow: g("--risk-low"),
    riskMid: g("--risk-mid"),
    riskHigh: g("--risk-high"),
    riskSevere: g("--risk-severe"),
    neutral: g("--card-peek"),
    white: g("--white"),
  };
}

// 3D feel — subtle perspective on the default view, deeper tilt when a district
// is tapped. maxPitch caps how far the user can tilt. Pitch is harmless in
// offline/demo mode (no tiles to skew), so it's always applied in 3D mode.
const DEFAULT_PITCH = 50;
const DEFAULT_BEARING = -10;
const MAX_PITCH = 60;
const DISTRICT_PITCH = 55;
const CLICK_FLY_DURATION_MS = 700; // gentle fly to the tap point
const TOGGLE_DURATION_MS = 500; // smooth 2D↔3D ease

// 2D/3D mode persistence. 3D is the default; the user's last choice is stored in
// localStorage so the preference survives reloads.
const MODE3D_STORAGE_KEY = "demai.map.mode3d";

// 3D buildings (optional, timeboxed). Extruded in the §1.4 slate block color so
// they read as a continuation of the basemap, only from zoom 13+ so the whole-
// city overview stays clean. fill-extrusion-height coalesces render_height →
// height → 12, so tiles without a height attribute still extrude uniformly.
const BUILDING_EXTRUSION_MIN_ZOOM = 13;
const BUILDING_EXTRUSION_OPACITY = 0.85;
const BUILDING_EXTRUSION_FALLBACK_HEIGHT = 12; // uniform 10–14m band

// CARTO positron GL style — free, ultra-light, minimal streets & labels.
// We FETCH its JSON at startup (not hand the URL to MapLibre), run it through
// restyleToSlate() to repaint it to the §1.4 slate palette, then hand the
// transformed style OBJECT to `new Map(...)`. We never iterate a live style's
// layers (that was the old null-filter crash) and never repaint after load.
const POSITRON_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Max wait for the positron JSON fetch before falling back to LOCAL_STYLE.
// The fetch is small (~80 KB); 6s covers a slow venue Wi-Fi. On timeout/failure
// we construct the map with LOCAL_STYLE so dots still render offline.
const STYLE_FETCH_TIMEOUT_MS = 6000;

/**
 * Fetch the positron style JSON and restyle it to the §1.4 slate palette.
 * Returns a transformed StyleSpecification, or null on any failure (network,
 * parse, restyle throw) so the caller can fall back to LOCAL_STYLE. Never
 * throws — a basemap failure must never blank the map (DESIGN §5.3).
 */
async function fetchSlateStyle(palette: MapPalette): Promise<StyleSpecification | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      STYLE_FETCH_TIMEOUT_MS,
    );
    try {
      const res = await fetch(POSITRON_STYLE_URL, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as StyleSpecification;
      return restyleToSlate(json, palette);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

// Minimal inline fallback style: one background layer, no sources, no glyphs.
// Used when isDemo() OR the positron style fails to load within 6s. It never
// fetches anything, so 'style.load' always fires and there is no tile worker
// to feed null into. Dots render on the solid --map-water background. Built
// inside the mount effect (see buildLocalStyle) because the background color
// is read from a CSS variable at runtime — no color literal lives here.
function buildLocalStyle(palette: MapPalette): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      { id: "bg", type: "background", paint: { "background-color": palette.water } },
    ],
  };
}

/** Resolve a risk value to its literal §1.3 --risk-* color from the palette. */
function riskColor(risk: number, palette: MapPalette): string {
  if (risk >= 9) return palette.riskSevere;
  if (risk >= 7) return palette.riskHigh;
  if (risk >= 4) return palette.riskMid;
  return palette.riskLow;
}

type EnrichedProps = HexFeatureProps & { color: string; riskNum: number; dotId: number };
type EnrichedPointFeature = Omit<CellPointFeature, "properties"> & {
  properties: EnrichedProps;
  id?: number;
};

/**
 * restyleToSlate — pure transform (DESIGN §1.4). Deep-clones the positron style
 * and rewrites ONLY paint properties (plus `visibility` on symbol layers we
 * want to hide). Never touches filters, never touches layout except visibility,
 * never mutates the input. Each layer edit is wrapped in try/catch so a single
 * odd layer can never throw the whole restyle — unmatched layers are skipped.
 *
 * Run this BEFORE handing the style to `new Map(...)` — we never repaint a live
 * style (that was the old null-filter crash in the tile worker).
 */
export function restyleToSlate(style: StyleSpecification, palette: MapPalette): StyleSpecification {
  // Deep clone so the input is never mutated. The style is JSON-serializable.
  const out: StyleSpecification = JSON.parse(JSON.stringify(style));
  if (!Array.isArray(out.layers)) return out;

  for (const layer of out.layers) {
    try {
      const id = String(layer.id ?? "").toLowerCase();
      const paint = (layer.paint ?? {}) as Record<string, unknown>;
      const layout = (layer.layout ?? {}) as Record<string, unknown>;

      // ---- Symbol layers (labels) -----------------------------------------
      if (layer.type === "symbol") {
        // Keep ONLY place labels for city/town/suburb/village/hamlet/capital.
        // Country/state/continent are admin labels, not place labels — hide.
        const isPlaceLabel =
          (id.includes("place") &&
            (id.includes("city") ||
              id.includes("town") ||
              id.includes("suburb") ||
              id.includes("village") ||
              id.includes("hamlet") ||
              id.includes("capital"))) ||
          id.includes("suburb") ||
          id.includes("neighbour") ||
          id.includes("locality");

        if (isPlaceLabel) {
          paint["text-color"] = palette.labelText;
          paint["text-halo-color"] = palette.labelHalo;
          paint["text-halo-width"] = 1.2;
          layer.paint = paint;
        } else {
          // POI labels, road names/shields, housenumber, water labels, transit,
          // country/state/continent → invisible. Only `visibility` (layout) is
          // touched, per the "never layout except visibility" rule.
          layout["visibility"] = "none";
          layer.layout = layout;
        }
        continue;
      }

      // ---- Fill layers ----------------------------------------------------
      if (layer.type === "fill") {
        if (id.includes("water")) {
          paint["fill-color"] = palette.water;
        } else if (
          id.includes("park") ||
          id.includes("landcover") ||
          id.includes("green")
        ) {
          paint["fill-color"] = palette.park;
        } else if (id.includes("building") || id.includes("block")) {
          paint["fill-color"] = palette.block;
        } else {
          // background / land / landuse → base slate land.
          paint["fill-color"] = palette.land;
        }
        layer.paint = paint;
        continue;
      }

      // ---- Background layer -----------------------------------------------
      if (layer.type === "background") {
        paint["background-color"] = palette.land;
        layer.paint = paint;
        continue;
      }

      // ---- Line layers ----------------------------------------------------
      if (layer.type === "line") {
        // Admin boundaries first — kill the red positron dashed boundaries.
        if (id.includes("boundary") || id.includes("admin")) {
          paint["line-color"] = palette.boundary;
          delete paint["line-dasharray"];
          layer.paint = paint;
          continue;
        }

        // Waterway lines → blend with water fill.
        if (id.includes("water")) {
          paint["line-color"] = palette.water;
          delete paint["line-dasharray"];
          layer.paint = paint;
          continue;
        }

        // Roads by id keyword (matches both *_case and *_fill positron layers
        // for motorway/trunk/primary/secondary/minor/service/path). Setting the
        // same bright color on case + fill yields a solid bright ribbon.
        const isMajor =
          id.includes("mot") ||
          id.includes("trunk") ||
          id.includes("pri");
        const isMid = id.includes("sec") || id.includes("tertiary");
        const isMinor =
          id.includes("minor") ||
          id.includes("residential") ||
          id.includes("service") ||
          id.includes("path") ||
          id.includes("street");

        if (isMajor) {
          paint["line-color"] = palette.roadMajor;
          paint["line-width"] = [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            2.5,
            16,
            3.5,
          ];
          delete paint["line-dasharray"];
          layer.paint = paint;
        } else if (isMid) {
          paint["line-color"] = palette.roadMid;
          paint["line-width"] = [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            1.5,
            16,
            2,
          ];
          delete paint["line-dasharray"];
          layer.paint = paint;
        } else if (isMinor) {
          paint["line-color"] = palette.roadMinor;
          paint["line-width"] = 1;
          delete paint["line-dasharray"];
          layer.paint = paint;
        }
        // Non-matching lines (aeroway, rail, tunnel_rail) → skip, untouched.
        continue;
      }
    } catch {
      /* skip this layer — never throw */
    }
  }

  return out;
}

/**
 * Sanitize every cell-center point BEFORE it reaches MapLibre so a bad feature
 * can never silently blank the map.
 *
 *   • risk → riskNum (Number.isFinite ? risk : 0); null/NaN risk →
 *     palette.neutral, else the --risk-* band. Stored as `color` (a literal
 *     resolved from CSS vars), so circle-color is just
 *     ['coalesce',['get','color'],palette.neutral] — NO interpolate/step,
 *     NO null ever reaching a paint prop.
 *   • coords: confirm a finite [lng,lat] pair; drop the feature otherwise.
 */
function sanitizePointsFC(fc: CellPointCollection, palette: MapPalette): {
  features: EnrichedPointFeature[];
  cellCount: number;
} {
  const features: EnrichedPointFeature[] = [];

  let dotId = 0;
  for (const f of fc.features) {
    const rawRisk = f.properties?.risk;
    const finite = Number.isFinite(Number(rawRisk));
    const riskNum = finite ? Number(rawRisk) : 0;
    // risk 0 / no-data → neutral grey (DESIGN §1.2 --card-peek). Only real
    // risks (>=1) get a --risk-* band, so the placeholder pass (all risk 0)
    // renders grey, not lime.
    const color = !finite || riskNum < 1 ? palette.neutral : riskColor(riskNum, palette);

    const coords = f.geometry?.coordinates;
    if (
      !Array.isArray(coords) ||
      coords.length < 2 ||
      !Number.isFinite(coords[0]) ||
      !Number.isFinite(coords[1])
    ) {
      continue;
    }

    const id = dotId++;
    const props: EnrichedProps = {
      slug: f.properties.slug,
      nameRu: f.properties.nameRu,
      nameKk: f.properties.nameKk,
      risk: riskNum,
      riskNum,
      color,
      // Per-dot solid radius (4.5–7 px) set by buildCellPointsGeoJSON's
      // size-variation step. Coalesce in the paint expression guards a missing
      // value (e.g. an old source) at 5.
      radius: Number.isFinite(Number(f.properties?.radius))
        ? Number(f.properties.radius)
        : 5,
      dotId: id,
    };
    features.push({
      type: "Feature",
      // promoteId lets us setFeatureState by this id without generateId.
      id,
      properties: props,
      geometry: { type: "Point", coordinates: [coords[0], coords[1]] },
    });
  }

  return { features, cellCount: features.length };
}

/**
 * Build the INVISIBLE interaction layer's GeoJSON from the 8 district polygons.
 * The raw `districtsFC` already carries {slug, nameRu, nameKk} on each feature;
 * we just normalize it into a plain FeatureCollection so MapLibre can consume it.
 * `fill-opacity: 0` makes it fully transparent but still queryable for taps.
 */
function buildDistrictsInteractionFC(districtsFC: DistrictFC): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const f of districtsFC.features) {
    features.push({
      type: "Feature",
      properties: {
        slug: f.properties.slug,
        nameRu: f.properties.nameRu,
        nameKk: f.properties.nameKk,
      },
      geometry: f.geometry as GeoJSON.Geometry,
    });
  }
  return { type: "FeatureCollection", features };
}

interface Selected {
  slug: string;
  nameRu: string;
  nameKk: string;
  risk: number;
}

export function MapClient({ districtsFC }: { districtsFC: DistrictFC }) {
  const router = useRouter();
  const tt = useT();
  const [locale] = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const prevSelectedSlugRef = useRef<string | null>(null);
  // Latest slug → risk (1..10) map from /api/risk/all. The click handler resolves
  // the tapped district's risk from this map (the invisible `districts` source
  // carries only {slug,nameRu,nameKk} — risk is looked up here, not stored on
  // the polygon feature, so a refresh doesn't require rebuilding the source).
  const riskBySlugRef = useRef<Record<string, number>>({});
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "denied">("idle");
  // 2D/3D mode. 3D (default) tilts the camera and shows building extrusion; 2D
  // flattens to pitch 0 / bearing 0 and hides extrusion. Persisted in
  // localStorage. `mode3D` drives the toggle button render; `modeRef` is read
  // inside the map-effect closures (click handler, applyDotData, extrusion add)
  // which capture the ref, not the state, so a toggle before style load still
  // resolves the current mode.
  const [mode3D, setMode3D] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = window.localStorage.getItem(MODE3D_STORAGE_KEY);
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  const modeRef = useRef<boolean>(mode3D);

  // ---- Build the map once on mount -----------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const demo = isDemo();
    // Resolve every §1.4 map color from CSS custom properties ONCE, in the
    // browser (DOM ready, CSS loaded). MapLibre paint props need literal color
    // strings; this is the bridge that keeps all hex/rgba in globals.css.
    const palette = readMapPalette();

    // React StrictMode (dev) mounts → cleanup (map.remove()) → re-mounts. The
    // first map's async 'style.load' callback can fire AFTER its removal, so
    // any map call inside these closures would throw on a disposed map. This
    // flag short-circuits every callback after cleanup so we never touch a
    // removed map (the real map is the second mount's).
    let disposed = false;

    // `ready` flips true once a style has finished loading — addSource/addLayer
    // throw "Style is not done loading" before that. Data that arrives before the
    // style is ready (e.g. a fast cached fetch) is stashed in `pending` and
    // applied when the style loads. `styleReady` guards the ready-transition
    // (initial load) so it only runs once.
    let ready = false;
    let styleReady = false;
    let pending: { type: "FeatureCollection"; features: EnrichedPointFeature[] } | null = null;
    // resizeObserver is wired inside setupMap() (after the map exists) but
    // disconnected in the cleanup, so it lives in this outer scope.
    let resizeObserver: ResizeObserver | null = null;

    let pointsFC: CellPointCollection = buildCellPointsGeoJSON(districtsFC, {}, H3_RES);
    // Sanitize BEFORE the map touches the data: per-feature literal `color` +
    // always-finite `riskNum`, validated [lng,lat] coords. Bad features are
    // dropped silently (no debug logs).
    const { features: enrichedFeatures } = sanitizePointsFC(pointsFC, palette);
    const enrichedFC = { type: "FeatureCollection" as const, features: enrichedFeatures };

    // The basemap style is resolved BEFORE the map is constructed (DESIGN §5.3
    // + §1.4 slate restyle):
    //   • demo mode → LOCAL_STYLE (solid --map-water, fully offline).
    //   • live mode → fetch the CARTO positron JSON, run restyleToSlate() to
    //     repaint it to the §1.4 slate palette, and hand the transformed OBJECT
    //     to `new Map(...)`. We never hand the URL to MapLibre and never repaint
    //     a live style (that was the old null-filter crash in the tile worker).
    //     fetchSlateStyle() has its own 6s timeout and returns null on any
    //     failure → we fall back to LOCAL_STYLE so dots still render.
    // `map` is assigned inside setupMap(); null until then so the cleanup path
    // (which may run before a pending fetch resolves) never touches a dead map.
    let map: maplibregl.Map | null = null;

    // Add the `dots` GeoJSON source + two stacked `circle` layers EXACTLY
    // ONCE. Idempotent: guarded by `map.getSource("dots")`, so calling it
    // again (e.g. after a setStyle fallback, or React StrictMode remounts)
    // never throws a duplicate-id error. The source starts empty; data is
    // pushed via applyDotData/setData. We never touch the basemap's layers.
    //
    // INTERACTION REDESIGN — data layer ≠ interaction layer:
    //   • `districts` source holds the 8 district polygons. Two layers are
    //     added BELOW the dots (insert-before "dot-glow"):
    //       - district-fill — INVISIBLE interaction layer (fill-opacity 0)
    //         but queryable. ALL tap/click handling binds here via
    //         queryRenderedFeatures, so tapping ANY building/street inside a
    //         district opens that district's sheet. Cursor: pointer over the
    //         whole city.
    //       - district-outline — selection feedback line (1.5px, --ink @
    //         0.35), opacity 0 by default with a 150ms transition. On select
    //         we setFilter to the tapped slug + line-opacity 0.35 → it fades
    //         in; on close we drop opacity back to 0 → fades out.
    //   • `dots` source uses promoteId:"dotId" so we can setFeatureState to
    //     slightly raise the selected district's dots (glow opacity + fill
    //     radius). The dot layers have NO click handlers — they are pure
    //     decoration + data glance and never intercept taps.
    // Two stacked circles read as a soft glowing dot field (Airly-style),
    // NOT area fills:
    //   • dot-glow — blurred underlayer (circle-blur, risk color @ 25%,
    //     radius ~12) gives each dot a soft halo so same-color neighbors
    //     cluster into a readable zone without washing out the streets.
    //   • dot-fill — solid dot (risk color, radius ~5, thin white ring) on
    //     top; non-interactive (no click handlers).
    // circle-color reads the per-feature literal `color` property, so the
    // paint never sees a null — coalesce falls back to neutral grey.
    function ensureDotLayers(): void {
      if (disposed || !map) return;
      if (map.getSource("dots")) return;
      try {
        // Dot field first (added on top of the basemap). The invisible
        // interaction layers are then inserted BEFORE "dot-glow" so they sit
        // above the basemap but below the dots.
        map.addSource("dots", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          promoteId: "dotId",
        });
        map.addLayer({
          id: "dot-glow",
          type: "circle",
          source: "dots",
          paint: {
            // Glow scales with the per-dot solid radius (~2.4×) so bigger dots
            // get a bigger halo. Coalesce guards a missing `radius` at 5.
            "circle-radius": ["*", ["coalesce", ["get", "radius"], 5], 2.4],
            "circle-color": ["coalesce", ["get", "color"], palette.neutral],
            // Slightly brighter halo for the selected district's dots.
            "circle-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.5,
              0.25,
            ],
            "circle-blur": 1.2,
          },
        });
        map.addLayer({
          id: "dot-fill",
          type: "circle",
          source: "dots",
          paint: {
            // Per-dot solid radius (4.5–7 px) from buildCellPointsGeoJSON's
            // size-variation step; +1 px boost for the selected district.
            "circle-radius": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              ["+", ["coalesce", ["get", "radius"], 5], 1],
              ["coalesce", ["get", "radius"], 5],
            ],
            "circle-color": ["coalesce", ["get", "color"], palette.neutral],
            "circle-opacity": 1,
            "circle-stroke-color": palette.white,
            "circle-stroke-width": 1,
            "circle-stroke-opacity": 0.9,
          },
        });

        // Invisible interaction layer (8 district polygons). Sits ABOVE the
        // basemap but BELOW the dots (insert-before "dot-glow").
        //
        // NOTE: `fill-opacity: 0` is NOT hit-testable in some MapLibre versions —
        // queryRenderedFeatures skips fully transparent fills, so taps anywhere
        // would return 0 hits and the sheet would never open. 0.01 is visually
        // invisible (1% alpha over a light basemap) but still rendered and
        // queryable. Do NOT lower it back to 0.
        map.addSource("districts", {
          type: "geojson",
          data: buildDistrictsInteractionFC(districtsFC),
        });
        map.addLayer(
          {
            id: "district-fill",
            type: "fill",
            source: "districts",
            paint: {
              "fill-color": palette.white,
              "fill-opacity": 0.01,
            },
          },
          "dot-glow",
        );
        map.addLayer(
          {
            id: "district-outline",
            type: "line",
            source: "districts",
            // No match initially → nothing drawn until a district is tapped.
            filter: ["==", ["get", "slug"], ""],
            paint: {
              // Selection outline — translucent white (DESIGN §1.4 slate map):
              // the old --ink outline vanished on dark water/land.
              "line-color": palette.selectOutline,
              "line-width": 1.5,
              "line-opacity": 0,
              "line-opacity-transition": { duration: 150, delay: 0 },
            },
          },
          "dot-glow",
        );
      } catch {
        /* ignore — idempotent re-entry */
      }
    }

    // Push a sanitized FeatureCollection into the existing `dots` source via
    // setData — NEVER re-addSource/addLayer. This is the only path that
    // touches source data after the one-time ensureDotLayers(). After pushing,
    // if there are points, recenter the camera on the data bounds so the dots
    // are on screen (the constructor fallback keeps us near Almaty, not
    // [0,0]). maxZoom caps fitBounds at whole-city zoom so all cells stay in
    // frame.
    function applyDotData(fc: { type: "FeatureCollection"; features: EnrichedPointFeature[] }): void {
      if (disposed || !map) return;
      // Defer until the map's style has loaded — addSource/addLayer throw
      // "Style is not done loading" before that. Stash the latest FC so the
      // most recent data wins when the style finally loads.
      if (!ready) {
        pending = fc;
        return;
      }
      try {
        ensureDotLayers();
        const src = map.getSource("dots");
        if (!src || src.type !== "geojson") return;
        (src as maplibregl.GeoJSONSource).setData(fc);

        if (fc.features.length > 0) {
          try {
            const b = pointsBounds({ type: "FeatureCollection", features: fc.features });
            // padding 60 (DESIGN §5.3) keeps the whole city in frame — a tighter
            // padding was zooming the camera to street-level on small dot bounds.
            // pitch/bearing follow the current mode (flat in 2D, tilted in 3D).
            // duration 0 is the initial framing, not an animation.
            const m3d = modeRef.current;
            map.fitBounds(b, {
              padding: 60,
              duration: 0,
              maxZoom: 11,
              pitch: m3d ? DEFAULT_PITCH : 0,
              bearing: m3d ? DEFAULT_BEARING : 0,
            });
          } catch {
            /* fitBounds failure is non-fatal */
          }
        }
      } catch {
        /* keep prior data — still not blank */
      }
    }

    // Style-ready handler: runs on the initial 'load' AND after a setStyle
    // fallback (which fires 'style.load', not 'load'). Idempotent via
    // `styleReady` so the ready-transition only happens once; sets `ready` so
    // applyDotData stops deferring and applies the latest FC. We never touch
    // the basemap's own layers here — only add our dots source/layers on top.
    function onStyleReady(): void {
      if (disposed || styleReady || !map) return;
      styleReady = true;
      ready = true;
      // Force MapLibre to read the container's real pixel dimensions. The
      // canvas can be baked at the pre-layout size (e.g. 430×300 from a
      // 0-height layout) before this fires; resize() reflows it to the true
      // viewport height.
      try {
        map.resize();
      } catch {
        /* ignore */
      }
      const initial = pending ?? enrichedFC;
      pending = null;
      applyDotData(initial);
      // 3D buildings (optional, timeboxed). Inspects the basemap's vector tiles
      // for a building layer with a height attribute; extrudes from zoom 13+.
      // No-op in demo/offline (LOCAL_STYLE has no building source → try/catch
      // skips silently). Pitch alone stays if anything errors.
      tryAddBuildingExtrusion();
      // Dev-only perf guard: if FPS tanks while tilted, drop the extrusion.
      startFpsGuard();
    }

    /**
     * tryAddBuildingExtrusion — Level 2 of the 3D feel (timeboxed, optional).
     *
     * Inspects the loaded basemap style for a `fill` layer whose id contains
     * "building" and that is backed by a vector source (positron exposes one
     * sourced from OpenMapTiles/CARTO). If found, adds a `fill-extrusion` layer
     * reusing that source + source-layer so the footprints rise into 3D blocks.
     *
     *   • color  — palette.block (== --map-land-2) so extrusions match the basemap's
     *     flat building fills and read as a continuation of the slate palette.
     *   • height — coalesce(render_height, height, 12). Tiles WITH a height
     *     attribute extrude to real per-building heights; tiles WITHOUT it
     *     extrude uniformly at 12m (the 10–14m band) — still looks 3D.
     *   • base 0, opacity 0.85.
     *   • minzoom 13 so the whole-city overview stays clean; only street-level
     *     and closer shows the extrusions.
     *
     * Wrapped in try/catch — any error (no building layer, non-vector source,
     * fill-extrusion unsupported) skips extrusion silently. Pitch alone stays.
     * Inserted BEFORE "dot-glow" so dots render on top of the blocks.
     */
    function tryAddBuildingExtrusion(): void {
      if (disposed || !map) return;
      if (map.getLayer("building-extrusion")) return;
      try {
        const style = map.getStyle();
        if (!style || !Array.isArray(style.layers)) return;
        let buildingSource: string | null = null;
        let buildingSourceLayer: string | null = null;
        for (const l of style.layers) {
          if (l.type !== "fill") continue;
          const id = String(l.id ?? "").toLowerCase();
          if (!id.includes("building")) continue;
          const src = (l as { source?: string }).source;
          const sl = (l as { "source-layer"?: string })["source-layer"];
          if (!src || !sl) continue;
          buildingSource = src;
          buildingSourceLayer = sl;
          break;
        }
        if (!buildingSource || !buildingSourceLayer) return;
        const srcDef = style.sources?.[buildingSource];
        if (!srcDef || srcDef.type !== "vector") return;

        map.addLayer(
          {
            id: "building-extrusion",
            type: "fill-extrusion",
            source: buildingSource,
            "source-layer": buildingSourceLayer,
            minzoom: BUILDING_EXTRUSION_MIN_ZOOM,
            layout: {
              // Start hidden if the user's saved preference is 2D; the toggle
              // flips this to "visible" when they switch to 3D.
              visibility: modeRef.current ? "visible" : "none",
            },
            paint: {
              "fill-extrusion-color": palette.block,
              "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                ["get", "height"],
                BUILDING_EXTRUSION_FALLBACK_HEIGHT,
              ],
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": BUILDING_EXTRUSION_OPACITY,
            },
          },
          "dot-glow",
        );
      } catch {
        /* skip extrusion silently — pitch alone stays */
      }
    }

    /**
     * startFpsGuard — dev-only performance guard (Level 2 safety net). Samples
     * FPS once per second via requestAnimationFrame; if the camera is tilted
     * (pitch > 30) and FPS stays below 25 for ~2 consecutive seconds, the
     * building-extrusion layer is removed (extrusion is the most likely tilt-
     * time perf cost). No-op in production. Stops sampling once it acts.
     */
    function startFpsGuard(): void {
      if (disposed || !map) return;
      if (process.env.NODE_ENV !== "production") {
        let frames = 0;
        let last = performance.now();
        let lowStreak = 0;
        const tick = () => {
          if (disposed || !map) return;
          frames++;
          const now = performance.now();
          if (now - last >= 1000) {
            const fps = (frames * 1000) / (now - last);
            frames = 0;
            last = now;
            try {
              if (map.getPitch() > 30 && fps < 25) {
                lowStreak++;
              } else {
                lowStreak = 0;
              }
              if (lowStreak >= 2 && map.getLayer("building-extrusion")) {
                map.removeLayer("building-extrusion");
                return; // stop sampling after acting
              }
            } catch {
              /* ignore */
            }
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }

    // ---- Construct the map + wire handlers (inside setupMap) ----------------
    // The map is created AFTER the basemap style is resolved (demo: immediate
    // LOCAL_STYLE; live: fetchSlateStyle() → restyleToSlate → construct). All
    // handler registration and the live-risk fetches run here, once the map
    // exists. `map` (outer let) is assigned first so the inner functions and
    // handlers see a non-null map.
    function setupMap(m: maplibregl.Map): void {
      map = m;
      mapRef.current = m;

      m.on("load", onStyleReady);

      // Keep the canvas sized to the container as the viewport changes. MapLibre
      // only auto-resizes on window resize; a layout-driven container change
      // (e.g. mobile URL bar show/hide changing 100dvh) needs an explicit
      // resize() call.
      if (containerRef.current && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (disposed || !map) return;
          try {
            map.resize();
          } catch {
            /* map removed — ignore */
          }
        });
        resizeObserver.observe(containerRef.current);
      }

      // Interaction: tapping ANYWHERE inside a district (any building/street)
      // opens that district's sheet. Hit-testing uses queryRenderedFeatures on
      // the INVISIBLE `district-fill` layer (fill-opacity 0.01 — visually
      // invisible but rendered and queryable; 0 is skipped by
      // queryRenderedFeatures in some MapLibre versions). The dot layers have
      // no handlers — they are decoration + data glance and never intercept
      // taps.
      //
      // PITCHED CAMERA: queryRenderedFeatures unprojects the screen point
      // through the pitched camera, so taps at the top/bottom screen edges
      // (where the camera is most tilted) still resolve the correct district
      // polygon. The 8 district polygons cover the whole city and are kept
      // queryable (fill-opacity 0.01), so even edge taps hit a district.
      //
      // The `districts` source features carry only {slug,nameRu,nameKk}; the
      // live `risk` is resolved here from riskBySlugRef (kept fresh by the
      // /api/risk/all fetch below). If the slug has no risk, we log an error and
      // bail rather than render a silent "—/10".
      m.on("click", (e) => {
        if (disposed || !map) return;
        if (!map.getLayer("district-fill")) return;
        const hits = map.queryRenderedFeatures(e.point, {
          layers: ["district-fill"],
        });
        const firstProps = hits?.[0]?.properties as
          | { slug?: string; nameRu?: string; nameKk?: string }
          | undefined;
        // Diagnostic: hit count + the first feature's properties. If length is 0
        // the fill isn't queryable (fill-opacity was 0 / layer missing / source
        // empty). If properties lack `slug`, the source was built without props.
        // eslint-disable-next-line no-console
        console.log("[map.click] district-fill hits:", hits?.length ?? 0, {
          firstProperties: firstProps,
          riskMapKeys: Object.keys(riskBySlugRef.current),
        });
        const f = hits?.[0];
        if (!f) return;
        const p = f.properties as { slug?: string; nameRu?: string; nameKk?: string };
        if (!p?.slug) {
          // eslint-disable-next-line no-console
          console.error("[map.click] tapped feature has no slug — properties:", p);
          return;
        }
        const risk = riskBySlugRef.current[p.slug];
        if (risk == null || !Number.isFinite(Number(risk))) {
          // eslint-disable-next-line no-console
          console.error(
            `[map.click] no risk found for slug "${p.slug}" — riskMap keys:`,
            Object.keys(riskBySlugRef.current),
          );
          return;
        }
        // Fly to the TAP POINT (e.lngLat), not the district centroid — the
        // camera moves to where the user tapped, never to a far-away centroid.
        // zoom: never zoom out — if already past 14, keep the current zoom.
        // pitch follows the current mode (55 in 3D, 0 in 2D). essential:true so
        // the fly still runs under prefers-reduced-motion. A failure here is
        // non-fatal — the sheet still opens.
        try {
          map.flyTo({
            center: [e.lngLat.lng, e.lngLat.lat],
            zoom: Math.max(map.getZoom(), 14),
            pitch: modeRef.current ? DISTRICT_PITCH : 0,
            duration: CLICK_FLY_DURATION_MS,
            essential: true,
          });
        } catch {
          /* non-fatal — sheet still opens */
        }
        setSelected({
          slug: p.slug,
          nameRu: p.nameRu ?? "",
          nameKk: p.nameKk ?? "",
          risk: Number(risk),
        });
      });
      // Cursor: pointer over the whole city (any pixel over a district polygon).
      m.on("mousemove", (e) => {
        if (disposed || !map) return;
        if (!map.getLayer("district-fill")) return;
        const hits = map.queryRenderedFeatures(e.point, {
          layers: ["district-fill"],
        });
        map.getCanvas().style.cursor = hits?.length ? "pointer" : "";
      });
      m.on("mouseout", () => {
        if (disposed || !map) return;
        map.getCanvas().style.cursor = "";
      });

      // ---- Fetch live risks and refresh the dots source ---------------------
      // Re-run sanitizePointsFC on every refresh so the live data also gets a
      // per-feature literal `color` + finite `riskNum`, then push via setData —
      // never re-add the source/layers.
      //
      // RACE GUARD: the live /api/risk/all composes 8 districts sequentially via
      // external calls and can take 5-7s. A tap before it resolves would find an
      // empty riskBySlugRef → "—/10". So in LIVE mode we fire a FAST demo-snapshot
      // fetch first (local file, ~100ms) to seed riskBySlugRef + the dots, then
      // the slow live fetch overwrites both when it arrives. Demo mode's primary
      // fetch IS the snapshot, so it skips the seed.
      const applyRows = (rows: { district: string; risk: number }[]): void => {
        const riskBySlug: Record<string, number> = {};
        for (const row of rows) riskBySlug[row.district] = row.risk;
        // Keep the click handler's lookup map fresh — this is the source of
        // truth for the sheet's risk number.
        riskBySlugRef.current = riskBySlug;
        pointsFC = buildCellPointsGeoJSON(districtsFC, riskBySlug, H3_RES);
        const { features } = sanitizePointsFC(pointsFC, palette);
        // Acceptance log: how many dots survived the deterministic thinning.
        // Target ~30-45 over the whole city at default zoom.
        // eslint-disable-next-line no-console
        console.log("[map.dots] visible count:", features.length, {
          bySlug: features.reduce<Record<string, number>>((acc, f) => {
            acc[f.properties.slug] = (acc[f.properties.slug] ?? 0) + 1;
            return acc;
          }, {}),
        });
        applyDotData({ type: "FeatureCollection", features });
      };

      if (demo) {
        // Demo mode: the snapshot is the source of truth — one fetch.
        fetch(`/api/risk/all?demo=1`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(applyRows)
          .catch(() => {
            /* keep neutral dots — still not blank */
          });
      } else {
        // Live mode: seed fast from the demo snapshot so a tap in the first
        // few seconds still resolves a risk, then refresh with live data.
        fetch(`/api/risk/all?demo=1`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(applyRows)
          .catch(() => {
            /* seed failure is non-fatal — live fetch still coming */
          });
        fetch(`/api/risk/all`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(applyRows)
          .catch(() => {
            /* Live fetch failed — the demo seed above already populated dots,
               so keep them. No further fallback needed. */
          });
      }
    }

    // ---- Kick off: resolve the basemap style, THEN construct the map ---------
    // Demo mode constructs immediately with LOCAL_STYLE (solid --map-water,
    // fully offline). Live mode fetches the positron JSON, restyles it to the
    // §1.4 slate palette, and constructs with the transformed object — or
    // falls back to LOCAL_STYLE if the fetch failed/timed out. The map is
    // never created with the remote URL; we never repaint a live style.
    const mapOptions: Omit<maplibregl.MapOptions, "container" | "style"> = {
      // Sane fallback center over Almaty (DESIGN §5.3) in case fitBounds never
      // runs — keeps the camera off [0,0] zoom 0.
      center: [76.9, 43.24],
      zoom: 10.5,
      minZoom: 8,
      maxZoom: 17,
      // 3D feel — default view gets a subtle perspective (pitch 50, bearing -10)
      // when 3D mode is on (the default). In 2D mode the camera starts flat
      // (pitch 0, bearing 0). maxPitch 60 caps tilt so the camera never goes
      // fully sideways. Pitch is harmless in offline/demo mode (no tiles to skew).
      pitch: mode3D ? DEFAULT_PITCH : 0,
      bearing: mode3D ? DEFAULT_BEARING : 0,
      maxPitch: MAX_PITCH,
      attributionControl: { compact: true },
    };

    if (demo) {
      if (containerRef.current) {
        setupMap(
          new maplibregl.Map({
            container: containerRef.current,
            style: buildLocalStyle(palette),
            ...mapOptions,
          }),
        );
      }
    } else {
      fetchSlateStyle(palette).then((slateStyle) => {
        if (disposed || !containerRef.current) return;
        const style = slateStyle ?? buildLocalStyle(palette);
        setupMap(
          new maplibregl.Map({
            container: containerRef.current,
            style,
            ...mapOptions,
          }),
        );
      });
    }

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      map?.remove();
      map = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtsFC]);

  // ---- Selection feedback: outline glow + dot boost -----------------------
  // When a district is tapped, fade its boundary in (1.5px rgba(255,255,255,.45)
  // — the alpha is baked into the line-color, so on-select line-opacity is 1.0
  // to show the intended 0.45; the 150ms transition still fades it) and slightly
  // raise that district's dots (feature-state "selected"). When the sheet
  // closes, fade the outline back out and clear the dot boost. The dot field
  // itself stays non-interactive — this effect only touches
  // paint/filter/feature-state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Layers may not exist yet (pre style-load). Tap can't happen before they
    // do, but StrictMode/cleanup can run this with a disposed map — guard.
    if (!map.getSource("districts")) return;

    const prevSlug = prevSelectedSlugRef.current;
    const nextSlug = selected?.slug ?? null;

    // Clear the previous selection's dot boost.
    if (prevSlug && prevSlug !== nextSlug) {
      try {
        const prevDots = map.queryRenderedFeatures({
          layers: ["dot-fill"],
          filter: ["==", ["get", "slug"], prevSlug],
        });
        for (const d of prevDots) {
          if (d.id != null) {
            map.setFeatureState({ source: "dots", id: d.id }, { selected: false });
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (nextSlug) {
      try {
        // Outline: filter to the tapped district + fade in (transition 150ms).
        // line-opacity 1.0 — the rgba(255,255,255,.45) color already encodes the
        // alpha; multiplying by 0.35 (tuned for opaque --ink) would render ~0.16.
        map.setFilter("district-outline", ["==", ["get", "slug"], nextSlug]);
        map.setPaintProperty("district-outline", "line-opacity", 1);
        // Dot boost: raise the selected district's rendered dots.
        const nextDots = map.queryRenderedFeatures({
          layers: ["dot-fill"],
          filter: ["==", ["get", "slug"], nextSlug],
        });
        for (const d of nextDots) {
          if (d.id != null) {
            map.setFeatureState({ source: "dots", id: d.id }, { selected: true });
          }
        }
      } catch {
        /* ignore */
      }
    } else {
      try {
        // Sheet closed → fade the outline back out (transition 150ms).
        map.setPaintProperty("district-outline", "line-opacity", 0);
      } catch {
        /* ignore */
      }
    }

    prevSelectedSlugRef.current = nextSlug;
  }, [selected]);

  // ---- Locate: flyTo browser geolocation -----------------------------------
  function handleLocate(): void {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("idle");
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 12,
          duration: 1200,
        });
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // ---- 2D/3D mode setter ----------------------------------------------------
  // Smoothly eases the camera between tilted (3D) and flat (2D), and shows/hides
  // the building-extrusion layer. The choice is persisted to localStorage so it
  // survives reloads. A no-op on camera/extrusion if the map or layer isn't
  // ready yet (state still flips + persists, so the next mount honors it).
  function setMode(next: boolean): void {
    setMode3D((prev) => {
      if (prev === next) return prev;
      modeRef.current = next;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(MODE3D_STORAGE_KEY, next ? "1" : "0");
        }
      } catch {
        /* storage may be blocked — keep the in-memory choice */
      }
      const map = mapRef.current;
      if (map) {
        try {
          if (next) {
            // → 3D: tilt back to the default perspective + show buildings.
            map.easeTo({
              pitch: DEFAULT_PITCH,
              bearing: DEFAULT_BEARING,
              duration: TOGGLE_DURATION_MS,
            });
            if (map.getLayer("building-extrusion")) {
              map.setLayoutProperty("building-extrusion", "visibility", "visible");
            }
          } else {
            // → 2D: flatten to top-down + hide buildings.
            map.easeTo({ pitch: 0, bearing: 0, duration: TOGGLE_DURATION_MS });
            if (map.getLayer("building-extrusion")) {
              map.setLayoutProperty("building-extrusion", "visibility", "none");
            }
          }
        } catch {
          /* non-fatal — mode still flipped + persisted */
        }
      }
      return next;
    });
  }

  function handleModeChange(v: ModeSwitchValue): void {
    setMode(v === "3d");
  }

  const sheetVerdict = selected
    ? locale === "kk"
      ? riskVerdict(selected.risk).textKk
      : riskVerdict(selected.risk).textRu
    : "";
  const sheetName = selected
    ? locale === "kk"
      ? selected.nameKk
      : selected.nameRu
    : "";

  return (
    <div
      className="flex w-full justify-center"
      style={{ height: "100dvh", background: "var(--bg-page)" }}
    >
      <div
        className="relative w-full max-w-[430px] overflow-hidden"
        style={{ height: "100dvh", background: "var(--map-water)" }}
      >
        {/* MapLibre canvas — explicit pixel height so it never collapses to 0.
            The parent has a real height (not min-height), so this div sizes
            against it. MapTopBar/ModeSwitch/BottomToggle overlay on top via absolute/fixed. */}
        <div ref={containerRef} className="w-full" style={{ height: "100dvh" }} />

        {/* TopBar overlay — glass bar (top-left, protruding logo slot) + glass
            search/locate circles (top-right). Replaces the old avatar+city pill. */}
        <MapTopBar
          city={tt("app.city")}
          country={tt("app.country")}
          onSearch={() => {}}
          onLocate={handleLocate}
        />
        {geoStatus === "locating" ? (
          <div
            className="absolute z-20 text-caption"
            style={{ left: 12, top: 84, color: "var(--white-70)" }}
          >
            {tt("map.geo.locating")}
          </div>
        ) : null}
        {geoStatus === "denied" ? (
          <div
            className="absolute z-20 text-caption"
            style={{ left: 12, top: 84, color: "var(--white-70)" }}
          >
            {tt("map.geo.denied")}
          </div>
        ) : null}

        {/* Mode switch — lime capsule centered just below the top bar row, with
            a sliding ink 2D/3D selector. Replaces the old glass 2D/3D toggle
            button. Wires to the existing pitch + extrusion + localStorage logic. */}
        <ModeSwitch
          value={mode3D ? "3d" : "2d"}
          onChange={handleModeChange}
          ariaLabel="Режим карты 2D/3D"
        />

        {/* Bottom toggle — fixed bottom-center, map active */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex justify-center"
          style={{ pointerEvents: "none" }}
        >
          <div style={{ pointerEvents: "auto" }} className="mx-auto mb-4 w-full max-w-[430px] px-5">
            <BottomToggle
              active="map"
              onChange={(a) => a === "list" && router.push("/home")}
            />
          </div>
        </div>

        {/* Dot-tap preview sheet */}
        {selected ? (
          <PreviewSheet
            name={sheetName}
            risk={selected.risk}
            verdict={sheetVerdict}
            onClose={() => setSelected(null)}
            onOpen={() => router.push(`/d/${encodeURIComponent(selected.slug)}`)}
          />
        ) : null}
      </div>
    </div>
  );
}

function PreviewSheet({
  name,
  risk,
  verdict,
  onClose,
  onOpen,
}: {
  name: string;
  risk: number;
  verdict: string;
  onClose: () => void;
  onOpen: () => void;
}) {
  const tt = useT();
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop — tap to close */}
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(33,33,33,0.35)", border: "none", cursor: "pointer" }}
      />

      <div
        className="relative mx-3 mb-24 flex flex-col gap-3 p-5"
        style={{
          background: "var(--white)",
          borderRadius: "var(--r-card)",
          boxShadow: "var(--shadow-float)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-h2 text-ink leading-[24px]">{name}</h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: 36, height: 36, background: "var(--icon-bg)", color: "var(--ink)",
              border: "none", cursor: "pointer",
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <AccentBlock value={risk || "—"} unit={tt("map.sheetUnit")} verdict={verdict} />

        <PrimaryButton onClick={onOpen}>{tt("map.open")}</PrimaryButton>
      </div>
    </div>
  );
}
