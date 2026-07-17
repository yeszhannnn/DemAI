/**
 * app/d/[district]/page.tsx — the Detail screen (DESIGN §5.1).
 *
 * The single scrolling page that IS the product and the stage demo. Server
 * component awaits `params` (Next 16 passes a Promise), reads the `demo` flag,
 * and hands both to a thin client bridge (`DetailClient`) which reads the
 * anonymous profile from localStorage (useProfile) and fetches `/api/risk`.
 *
 * Demo path (DESIGN §7): `?demo=1` → the API serves the committed snapshot with
 * zero external network, so the demo never depends on venue Wi-Fi.
 *
 * Exact section order (§5.1):
 *   1. TopBar(detail)        2. Hero            3. ActionsCard
 *   4. Pollen row            5. Air row         6. ForecastBars
 *   7. WhyCard               8. BotBanner + push preview
 *   9. Disclaimer (always on, including sparse + demo)
 */

import { DetailClient } from "./detail-client";

interface PageProps {
  params: Promise<{ district: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DistrictPage({ params, searchParams }: PageProps) {
  const { district: slug } = await params;
  const sp = await searchParams;
  const demoRaw = sp.demo;
  const demo = (Array.isArray(demoRaw) ? demoRaw[0] : demoRaw) === "1";
  return <DetailClient district={slug} demo={demo} />;
}
