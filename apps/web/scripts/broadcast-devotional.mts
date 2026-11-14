/**
 * Create a Kit broadcast DRAFT from a devotional. It never schedules or sends: open the draft in
 * Kit, send yourself a test, then schedule it there.
 *
 *   pnpm broadcast:devotional <slug> --tag <id>     only subscribers with that Kit tag
 *   pnpm broadcast:devotional <slug> --all          every subscriber (on purpose)
 *
 * Uses KIT_API_KEY_PREVIEW; add --live to use KIT_API_KEY. SITE_URL sets the "read it on the
 * website" link (default https://wordonthewater.net).
 */
import { parseArgs } from "node:util";

import { loadDevotionals } from "../src/lib/devotionals/load.ts";
import {
  audienceFromArgs,
  broadcastDraft,
  createBroadcastDraft,
} from "../src/lib/devotionals/kit-broadcast.ts";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { tag: { type: "string" }, all: { type: "boolean" }, live: { type: "boolean" } },
  });
  const [slug] = positionals;
  if (!slug)
    throw new Error("Give the devotional folder name, for example advent-01-more-than-watchmen.");

  const devotional = loadDevotionals().find((d) => d.slug === slug);
  if (!devotional) throw new Error(`No devotional folder named "${slug}" in content/devotionals.`);

  const keyName = values.live ? "KIT_API_KEY" : "KIT_API_KEY_PREVIEW";
  const apiKey = process.env[keyName];
  if (!apiKey) throw new Error(`${keyName} is not set (it is read from the root .env).`);

  const draft = broadcastDraft(devotional, {
    siteUrl: process.env.SITE_URL ?? "https://wordonthewater.net",
    audience: audienceFromArgs(values),
  });
  const id = await createBroadcastDraft(draft, apiKey);
  console.log(`Draft ${id} created for "${slug}" (${values.live ? "live" : "preview"} key).`);
  console.log(
    "Nothing was scheduled or sent. Review it in Kit, send yourself a test, then schedule it.",
  );
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
