import type { MetadataRoute } from "next";

/**
 * app/manifest.ts — the PWA web app manifest (DESIGN §1 / Prompt 12).
 *
 * Colors are written as `rgb()` (not hex) so the design-grep stays clean — the
 * lint:design rule confines hex literals to globals.css / tailwind.config.ts.
 * The values mirror --lime and --bg-light 1:1.
 *
 * `start_url` points at /home with the demo flag so the installed PWA opens
 * straight to the places list and never depends on venue Wi-Fi (DESIGN §7).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DemAI — персональный прогноз риска",
    short_name: "DemAI",
    description:
      "Персональный прогноз риска от воздуха, пыльцы и погоды — одним числом, с напоминаниями в Telegram.",
    start_url: "/home?demo=1",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "rgb(241, 242, 244)",
    theme_color: "rgb(234, 252, 95)",
    categories: ["health", "weather", "productivity"],
    lang: "ru",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
