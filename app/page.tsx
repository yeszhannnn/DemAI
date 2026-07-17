"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";

/**
 * Root guard (PROMPTS §6.4, DESIGN §7 returning-user rule).
 *   - complete profile  → straight to Detail (`/d/<district>`)
 *   - no / partial profile → onboarding (never repeats once complete)
 *
 * Client component: the profile lives in localStorage, read via
 * `useSyncExternalStore` (see lib/useProfile.ts). The server snapshot is
 * `null`, and React swaps in the real client snapshot synchronously after
 * hydration, before this effect runs — so the redirect is always decided on
 * real data, never on a stale empty snapshot. Renders nothing meanwhile.
 */
export default function Home() {
  const router = useRouter();
  const { profile, isComplete } = useProfile();

  useEffect(() => {
    if (isComplete && profile?.district) {
      router.replace(`/d/${profile.district}`);
    } else {
      router.replace("/onboarding");
    }
  }, [isComplete, profile, router]);

  return null;
}
