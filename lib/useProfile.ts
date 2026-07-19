"use client";

/**
 * useProfile — client hook for the anonymous profile (PROMPTS §6.2).
 *
 *   - `anonId`   : a UUID generated once on first visit, persisted under
 *                  `demai:anonid`. Never leaves the phone during onboarding
 *                  (no network calls — §6 acceptance).
 *   - `profile`  : the Prompt-3 `Profile` (lib/risk.ts), persisted under
 *                  `demai:profile`.
 *   - `isComplete`: who + diagnosis + district all set (triggers may be empty
 *                  — the "Ничего" option on S3 is legitimate, so it is NOT
 *                  part of the gate).
 *
 * Backed by `useSyncExternalStore` reading a tiny module-level store. This is
 * the React-blessed way to consume localStorage: no `setState`-in-effect, no
 * hydration mismatch (a stable server snapshot of `null` is used during SSR,
 * then the client snapshot is taken synchronously after hydration, before any
 * effect runs — so the §7 redirect guard never fires on stale data).
 *
 * The Profile type is re-exported from lib/risk.ts so the whole app shares
 * ONE definition (Prompt 3 type).
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Profile } from "./risk";

const ANON_KEY = "demai:anonid";
const PROFILE_KEY = "demai:profile";
const PLACES_KEY = "demai:places";
const DIARY_COUNT_KEY = "demai:diary-count";
const DIARY_TODAY_KEY = "demai:diary-today";
const EVENT = "demai:profile-change";

const isBrowser = typeof window !== "undefined";

/**
 * Place — DESIGN §5.2 / PROMPTS §8.1. A saved location on the Home places list.
 * `label` is one of the preset names («Дом» / «Школа» / «Секция») in the user's
 * locale, or any free-form string; `district` is a `data/districts.ts` slug.
 */
export interface Place {
  id: string;
  label: string;
  district: string;
}

function uuid(): string {
  if (isBrowser && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- module-level store (stable snapshot references) -----------------------

let cachedAnonId = "";
let cachedProfile: Profile | null = null;
let cachedPlaces: Place[] = [];
let cachedDiaryCount = 0;
let cachedTodayMarked = false;
let initialized = false;
const listeners = new Set<() => void>();

function readProfileFromStorage(): Profile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

function readPlacesFromStorage(): Place[] {
  try {
    const raw = window.localStorage.getItem(PLACES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (p): p is Place =>
          p &&
          typeof p === "object" &&
          typeof p.id === "string" &&
          typeof p.label === "string" &&
          typeof p.district === "string",
      )
      .slice(0, 12);
  } catch {
    return [];
  }
}

function readDiaryCountFromStorage(): number {
  try {
    const raw = window.localStorage.getItem(DIARY_COUNT_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/** Today's diary row is "marked" if the stored date equals today's Almaty date.
 *  Storing the date (not a boolean) makes the flag self-expire at midnight. */
function almatyDateClient(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function readTodayMarkedFromStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(DIARY_TODAY_KEY);
    return raw === almatyDateClient();
  } catch {
    return false;
  }
}

function init(): void {
  if (initialized || !isBrowser) return;
  initialized = true;
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(ANON_KEY, id);
    }
    cachedAnonId = id;
  } catch {
    cachedAnonId = uuid();
  }
  cachedProfile = readProfileFromStorage();
  cachedPlaces = readPlacesFromStorage();
  cachedDiaryCount = readDiaryCountFromStorage();
  cachedTodayMarked = readTodayMarkedFromStorage();
}

// Initialise once on module load (client only). Runs before hydration.
init();

function notify(): void {
  if (!isBrowser) return;
  window.dispatchEvent(new CustomEvent(EVENT));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (isBrowser) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ANON_KEY || e.key === PROFILE_KEY || e.key === PLACES_KEY) {
        cachedAnonId =
          (window.localStorage.getItem(ANON_KEY) ?? cachedAnonId) || cachedAnonId;
        cachedProfile = readProfileFromStorage();
        if (e.key === PLACES_KEY) cachedPlaces = readPlacesFromStorage();
        cb();
      }
      if (e.key === DIARY_COUNT_KEY) {
        cachedDiaryCount = readDiaryCountFromStorage();
        cb();
      }
      if (e.key === DIARY_TODAY_KEY) {
        cachedTodayMarked = readTodayMarkedFromStorage();
        cb();
      }
    };
    const onCustom = () => cb();
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onCustom);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, onCustom);
    };
  }
  return () => listeners.delete(cb);
}

function getProfileSnapshot(): Profile | null {
  // Ensure initialised on the client even if the module ran on the server
  // first (e.g. during a fast-refresh re-evaluation).
  if (isBrowser && !initialized) init();
  return cachedProfile;
}
function getAnonSnapshot(): string {
  if (isBrowser && !initialized) init();
  return cachedAnonId;
}
function getPlacesSnapshot(): Place[] {
  if (isBrowser && !initialized) init();
  return cachedPlaces;
}
function getDiaryCountSnapshot(): number {
  if (isBrowser && !initialized) init();
  return cachedDiaryCount;
}
function getTodayMarkedSnapshot(): boolean {
  if (isBrowser && !initialized) init();
  return cachedTodayMarked;
}
function getServerSnapshot(): null {
  return null;
}
function getServerAnon(): string {
  return "";
}
function getServerPlaces(): Place[] {
  return [];
}
function getServerDiaryCount(): number {
  return 0;
}
function getServerTodayMarked(): boolean {
  return false;
}

// --- /api/me sync (self-learning loop, PROMPTS §11.3) ---------------------

interface MeResponse {
  personalPm25: number | null;
  diaryCount: number;
  todayMarked?: boolean;
}

let meSyncAnonId = "";
let meSyncPromise: Promise<void> | null = null;

/**
 * Fetch /api/me once per anon id and mirror `personalPm25` into the local
 * profile + `diaryCount` into localStorage. Guarded by a module-level promise
 * so multiple `useProfile` instances in the same app never duplicate the call
 * (the prompt says "fetches /api/me once"). Re-runs only if the anon id changes.
 *
 * Best-effort: a network failure leaves the locally-cached threshold in place,
 * so the offline / demo path is unaffected.
 */
export function syncMe(anonId: string): Promise<void> {
  if (!isBrowser || !anonId) return Promise.resolve();
  if (meSyncAnonId === anonId && meSyncPromise) return meSyncPromise;
  meSyncAnonId = anonId;
  meSyncPromise = (async () => {
    try {
      const r = await fetch(
        `/api/me?anonId=${encodeURIComponent(anonId)}`,
        { cache: "no-store" },
      );
      if (!r.ok) return;
      const j = (await r.json()) as MeResponse;
      setDiaryCount(j.diaryCount ?? 0);
      setTodayMarked(!!j.todayMarked);
      const p = cachedProfile;
      if (!p) return;
      const incoming =
        typeof j.personalPm25 === "number" ? j.personalPm25 : null;
      if (incoming !== null) {
        if (p.personalPm25 !== incoming) {
          saveProfileInternal({ ...p, personalPm25: incoming });
        }
      } else if (p.personalPm25 !== undefined) {
        // Loop reopened (e.g. diary rows deleted) — drop the stale threshold.
        const { personalPm25: _drop, ...rest } = p;
        saveProfileInternal(rest);
      }
    } catch {
      /* network failure — keep cached values */
    }
  })();
  return meSyncPromise;
}

/** Internal save that updates the cache + storage without going through the
 *  hook closure (used by syncMe). */
function saveProfileInternal(p: Profile): void {
  cachedProfile = p;
  if (isBrowser) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }
  notify();
}

/** Reset the /api/me sync guard (test hook for re-syncing after an explicit
 *  diary write from the in-app modal). Safe to call repeatedly. */
export function resetMeSync(): void {
  meSyncAnonId = "";
  meSyncPromise = null;
}

// --- public API -----------------------------------------------------------

/** Read (or lazily create) the persistent anon id. */
export function getAnonId(): string {
  if (!isBrowser) return "";
  if (!initialized) init();
  return cachedAnonId;
}

/** Read the saved places list synchronously (client). */
export function getPlaces(): Place[] {
  if (!isBrowser) return [];
  if (!initialized) init();
  return cachedPlaces;
}

/** Read the last known diary row count (mirrored from /api/me). */
export function getDiaryCount(): number {
  if (!isBrowser) return 0;
  if (!initialized) init();
  return cachedDiaryCount;
}

/** Persist the diary count (mirrored from /api/me) and notify subscribers. */
export function setDiaryCount(n: number): void {
  const next = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  if (cachedDiaryCount === next) return;
  cachedDiaryCount = next;
  if (isBrowser) {
    try {
      window.localStorage.setItem(DIARY_COUNT_KEY, String(next));
    } catch {
      /* ignore */
    }
  }
  notify();
}

/** Read the "today's diary row already exists" flag (mirrored from /api/me). */
export function getTodayMarked(): boolean {
  if (!isBrowser) return false;
  if (!initialized) init();
  return cachedTodayMarked;
}

/** Persist the today-marked flag. Stores today's Almaty date so the flag
 *  self-expires at midnight; pass `true` to mark, `false` to clear. */
export function setTodayMarked(v: boolean): void {
  const nextMarked = !!v;
  if (cachedTodayMarked === nextMarked) return;
  cachedTodayMarked = nextMarked;
  if (isBrowser) {
    try {
      if (nextMarked) {
        window.localStorage.setItem(DIARY_TODAY_KEY, almatyDateClient());
      } else {
        window.localStorage.removeItem(DIARY_TODAY_KEY);
      }
    } catch {
      /* ignore */
    }
  }
  notify();
}

/** Persist the places list and notify subscribers. */
export function setPlaces(places: Place[]): void {
  cachedPlaces = places;
  if (isBrowser) {
    try {
      window.localStorage.setItem(PLACES_KEY, JSON.stringify(places));
    } catch {
      /* ignore */
    }
  }
  notify();
}

/** Append a place (capped at 12) and persist. Returns the new list. */
export function addPlace(place: Place): Place[] {
  const next = [...cachedPlaces, place].slice(0, 12);
  setPlaces(next);
  return next;
}

/** Remove a place by id and persist. Returns the new list. */
export function removePlace(id: string): Place[] {
  const next = cachedPlaces.filter((p) => p.id !== id);
  setPlaces(next);
  return next;
}

/** A profile is complete enough to skip onboarding (§7 returning-user rule). */
export function isProfileComplete(p: Profile | null): boolean {
  if (!p) return false;
  if (p.who !== "self" && p.who !== "parent") return false;
  if (p.who === "parent" && (p.childAge === undefined || p.childAge <= 0))
    return false;
  if (!Array.isArray(p.diagnosis) || p.diagnosis.length === 0) return false;
  if (!Array.isArray(p.triggers)) return false;
  if (!p.district) return false;
  return true;
}

export interface UseProfile {
  anonId: string;
  profile: Profile | null;
  places: Place[];
  diaryCount: number;
  todayMarked: boolean;
  isComplete: boolean;
  /** `false` through the first render (matching SSR), `true` once the client
   *  has run a `useEffect` after the localStorage read. Guards MUST NOT make
   *  routing decisions while `hydrated === false`: on a hard refresh the
   *  server snapshot is `null` and `isComplete` is transiently `false`, so a
   *  naive guard would bounce a complete profile to onboarding. Waiting one
   *  tick for `hydrated` guarantees the snapshot is real before any redirect. */
  hydrated: boolean;
  saveProfile: (p: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  clearProfile: () => void;
  clearAnonId: () => void;
  setPlaces: (places: Place[]) => void;
  addPlace: (place: Place) => void;
  removePlace: (id: string) => void;
  setDiaryCount: (n: number) => void;
  setTodayMarked: (v: boolean) => void;
}

export function useProfile(): UseProfile {
  const profile = useSyncExternalStore(
    subscribe,
    getProfileSnapshot,
    getServerSnapshot,
  );
  const anonId = useSyncExternalStore(
    subscribe,
    getAnonSnapshot,
    getServerAnon,
  );
  const places = useSyncExternalStore(
    subscribe,
    getPlacesSnapshot,
    getServerPlaces,
  );
  const diaryCount = useSyncExternalStore(
    subscribe,
    getDiaryCountSnapshot,
    getServerDiaryCount,
  );
  const todayMarked = useSyncExternalStore(
    subscribe,
    getTodayMarkedSnapshot,
    getServerTodayMarked,
  );

  // Explicit hydration signal. `useSyncExternalStore` returns the server
  // snapshot (`null` profile) during SSR and the first client render, then
  // swaps to the real client snapshot. That swap is enough for *rendering*
  // but is not a reliable gate for *routing*: a guard `useEffect` can fire in
  // the same commit that still observes the stale snapshot on some paths
  // (notably a hard refresh of /d/<district> followed by an immediate tap of
  // the grid button → /home). `hydrated` flips to `true` only in a subsequent
  // commit, after a `useEffect` has run, so any guard that waits on it can
  // never observe a pre-hydration tick. This is the single source of truth
  // for "the localStorage read has settled" (PROMPTS §7 returning-user rule).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Intentional cascading render: this is the canonical "has mounted" gate.
    // The extra render is the whole point — it flips `hydrated` to true only
    // in a commit AFTER the first, so no guard can observe a pre-hydration
    // tick. See the hook docstring for the race this closes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // Self-learning loop (PROMPTS §11.3): on app open, fetch /api/me once and
  // mirror `personalPm25` into the local profile. The sync guard dedupes
  // across hook instances and only re-runs if the anon id changes.
  useEffect(() => {
    if (anonId && isProfileComplete(profile)) syncMe(anonId);
  }, [anonId, profile]);

  function saveProfile(p: Profile): void {
    cachedProfile = p;
    if (isBrowser) {
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    }
    notify();
  }

  function updateProfile(patch: Partial<Profile>): void {
    const next: Profile = {
      who: "self",
      diagnosis: [],
      triggers: [],
      district: "",
      sensitive: false,
      ...cachedProfile,
      ...patch,
    };
    saveProfile(next);
  }

  function clearProfile(): void {
    cachedProfile = null;
    if (isBrowser) {
      try {
        window.localStorage.removeItem(PROFILE_KEY);
      } catch {
        /* ignore */
      }
    }
    notify();
  }

  function clearAnonId(): void {
    cachedAnonId = "";
    if (isBrowser) {
      try {
        window.localStorage.removeItem(ANON_KEY);
      } catch {
        /* ignore */
      }
    }
    // Reset the /api/me sync guard so the next anon id re-syncs from scratch.
    meSyncAnonId = "";
    meSyncPromise = null;
    notify();
  }

  function setPlacesHook(places: Place[]): void {
    setPlaces(places);
  }

  function addPlaceHook(place: Place): void {
    addPlace(place);
  }

  function removePlaceHook(id: string): void {
    removePlace(id);
  }

  return {
    anonId,
    profile,
    places,
    diaryCount,
    todayMarked,
    isComplete: isProfileComplete(profile),
    hydrated,
    saveProfile,
    updateProfile,
    clearProfile,
    clearAnonId,
    setPlaces: setPlacesHook,
    addPlace: addPlaceHook,
    removePlace: removePlaceHook,
    setDiaryCount,
    setTodayMarked,
  };
}

