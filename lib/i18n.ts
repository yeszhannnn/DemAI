/**
 * i18n — tiny dictionary module (PROMPTS §6.1).
 *
 * Two locales: `ru` (canonical, final) and `kk` (best-effort, every value
 * marked `// REVIEW: native speaker` in kk.ts). Locale is persisted in
 * localStorage under `demai:locale` and defaults to `ru`.
 *
 * API:
 *   - `t(key, locale?, vars?)`            — synchronous lookup with {var} interpolation
 *   - `getLocale()` / `setLocale(l)`      — read/write localStorage + notify subscribers
 *   - `useLocale()`                       — React hook, re-renders on locale change
 *   - `useT()`                           — React hook returning a `t` bound to current locale
 *
 * No network, no async — onboarding must make zero network calls (PROMPTS §6).
 * SSR-safe: every DOM/localStorage access is guarded by `typeof window`.
 */

import { useSyncExternalStore } from "react";
import { ru } from "./ru";
import { kk } from "./kk";
import type { Dict } from "./kk";

export type Locale = "ru" | "kk";

export const LOCALES: readonly Locale[] = ["ru", "kk"];

export type DictKey = keyof Dict;

const DICTS: Record<Locale, Dict> = { ru, kk };

const STORAGE_KEY = "demai:locale";
const EVENT = "demai:locale-change";

const isBrowser = typeof window !== "undefined";

function readStored(): Locale {
  if (!isBrowser) return "ru";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "ru" || v === "kk") return v;
  } catch {
    /* localStorage blocked (private mode) — fall back to default */
  }
  return "ru";
}

let currentLocale: Locale = isBrowser ? readStored() : "ru";

const listeners = new Set<() => void>();

function emit() {
  if (!isBrowser) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: currentLocale }));
  listeners.forEach((l) => l());
}

/** Current persisted locale (synchronous). */
export function getLocale(): Locale {
  return currentLocale;
}

/** Persist a new locale and notify subscribers. */
export function setLocale(l: Locale): void {
  if (l !== "ru" && l !== "kk") return;
  currentLocale = l;
  if (isBrowser) {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore write failures */
    }
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (isBrowser) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        currentLocale = readStored();
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

function getSnapshot(): Locale {
  return currentLocale;
}

/** React hook: re-renders when the locale changes (S0 language switch). */
export function useLocale(): [Locale, (l: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => "ru" as Locale);
  return [locale, setLocale];
}

/**
 * Look up a string for the given locale (default: current persisted locale).
 * `{name}` placeholders in `vars` are substituted.
 */
export function t(
  key: DictKey,
  locale: Locale = currentLocale,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTS[locale] ?? DICTS.ru;
  let s: string = dict[key] ?? DICTS.ru[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}

/** React hook returning a `t` bound to the current reactive locale. */
export function useT(): (key: DictKey, vars?: Record<string, string | number>) => string {
  const [locale] = useLocale();
  return (key, vars) => t(key, locale, vars);
}
