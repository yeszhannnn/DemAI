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

import { useSyncExternalStore } from "react";
import type { Profile } from "./risk";

const ANON_KEY = "demai:anonid";
const PROFILE_KEY = "demai:profile";
const EVENT = "demai:profile-change";

const isBrowser = typeof window !== "undefined";

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
      if (e.key === ANON_KEY || e.key === PROFILE_KEY) {
        cachedAnonId =
          (window.localStorage.getItem(ANON_KEY) ?? cachedAnonId) || cachedAnonId;
        cachedProfile = readProfileFromStorage();
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
function getServerSnapshot(): null {
  return null;
}
function getServerAnon(): string {
  return "";
}

// --- public API -----------------------------------------------------------

/** Read (or lazily create) the persistent anon id. */
export function getAnonId(): string {
  if (!isBrowser) return "";
  if (!initialized) init();
  return cachedAnonId;
}

/** A profile is complete enough to skip onboarding (§7 returning-user rule). */
export function isProfileComplete(p: Profile | null): boolean {
  if (!p) return false;
  if (p.who !== "self" && p.who !== "parent") return false;
  if (p.who === "parent" && (p.childAge === undefined || p.childAge <= 0))
    return false;
  if (!p.diagnosis) return false;
  if (!Array.isArray(p.triggers)) return false;
  if (!p.district) return false;
  return true;
}

export interface UseProfile {
  anonId: string;
  profile: Profile | null;
  isComplete: boolean;
  saveProfile: (p: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  clearProfile: () => void;
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
      diagnosis: "unknown",
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

  return {
    anonId,
    profile,
    isComplete: isProfileComplete(profile),
    saveProfile,
    updateProfile,
    clearProfile,
  };
}
