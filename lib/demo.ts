/**
 * Pitch / demo mode (DESIGN §7): ?demo=1 query or DEMO=1 env.
 * In demo mode data comes from a local snapshot with zero network —
 * the demo must not depend on venue Wi-Fi.
 */
export function isDemo(): boolean {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") return true;
  }
  return process.env.DEMO === "1";
}
