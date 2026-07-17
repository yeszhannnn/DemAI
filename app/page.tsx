"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { isDemo } from "@/lib/demo";
import { LandingClient } from "./landing/LandingClient";

/**
 * Root guard (DESIGN §5.5 / §7 returning-user rule).
 *   - complete profile  → straight to Detail (`/d/<district>`)
 *   - no / partial profile → the pre-onboarding Landing (§5.5). The «Начать»
 *     CTA on the landing pushes to /onboarding; if the user picked a locale
 *     on the landing, onboarding skips S0 and starts at S1.
 *
 * Client component: the profile lives in localStorage, read via
 * `useSyncExternalStore` (see lib/useProfile.ts). The server snapshot is
 * `null`, and React swaps in the real client snapshot synchronously after
 * hydration, before this effect runs — so the redirect is always decided on
 * real data, never on a stale empty snapshot. Renders the Landing meanwhile
 * (and for the no-profile case, which is the steady state).
 *
 * Demo mode is exempt from the guard so `/?demo=1` renders the Landing
 * standalone without network — the demo must not depend on venue Wi-Fi (§7).
 */
export default function Home() {
  const router = useRouter();
  const { profile, isComplete } = useProfile();
  const demo = isDemo();

  useEffect(() => {
    if (isComplete && profile?.district) {
      router.replace(`/d/${profile.district}${demo ? "?demo=1" : ""}`);
    }
  }, [isComplete, profile, demo, router]);

  // A complete profile redirects to Detail above. Otherwise show the Landing.
  if (isComplete && profile?.district) return null;
  return <LandingClient />;
}
