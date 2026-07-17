/**
 * scripts/tg-dev.ts — `npm run tg:dev`
 *
 * Long-polling runner for local Telegram bot testing without a public URL.
 * Reuses the SAME bot instance + handlers as the webhook route
 * (lib/tg-bot.ts), so /start <anonId>, /now and the diary buttons behave
 * exactly as in production.
 *
 * Env: reads `.env.local` (Next.js convention) so the script works standalone
 * without a running dev server. Kill with Ctrl-C.
 */

import { promises as fs } from "fs";
import path from "path";
import { getBot } from "../lib/tg-bot";

async function loadEnvLocal(): Promise<void> {
  // Try cwd first, then the workspace root (../.env.local) — the repo keeps
  // secrets at the workspace root, not in demai/.
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "..", ".env.local"),
  ];
  for (const file of candidates) {
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

async function main(): Promise<void> {
  await loadEnvLocal();

  if (!process.env.TG_BOT_TOKEN) {
    console.error("Missing TG_BOT_TOKEN — add it to .env.local");
    process.exit(1);
  }

  const bot = getBot();

  // Drop a pending webhook so long polling works (Telegram rejects polling
  // while a webhook is set).
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
  } catch (err) {
    console.warn("Could not delete webhook:", String(err));
  }

  console.log("DemAI bot long-polling…  /start <anonId>  /now  diary buttons");
  console.log("Ctrl-C to stop.");

  // bot.start() blocks, handling updates with the registered handlers.
  await bot.start({
    onStart: (me) => console.log(`Started @${me.username}`),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
