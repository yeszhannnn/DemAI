/**
 * app/api/tg/route.ts — grammY webhook endpoint.
 *
 * Telegram posts updates here; we verify `x-telegram-bot-api-secret-token`
 * against `TG_WEBHOOK_SECRET` before handing the request to grammY's
 * `webhookCallback` (std/http adapter → Web API Request/Response).
 *
 * Handlers live in lib/tg-bot.ts (registered once on the singleton bot):
 *   /start <anonId>  → upsert tg_links + reply with today's risk + 3 actions
 *   /now             → same on demand
 *   callback diary:1|2|3 → upsert today's diary row + edit message to «Записал ✅»
 */

import { webhookCallback } from "grammy";
import { getBot } from "@/lib/tg-bot";

export const dynamic = "force-dynamic";

const SECRET = process.env.TG_WEBHOOK_SECRET ?? "";

export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get("x-telegram-bot-api-secret-token");
  if (!SECRET || token !== SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  // grammY's std/http adapter is `(req: Request) => Promise<Response>` —
  // exactly what the Next App Router wants for a route handler. Built lazily so
  // the secret check above runs before the bot is constructed.
  const callback = webhookCallback(getBot(), "std/http");
  return callback(request);
}
