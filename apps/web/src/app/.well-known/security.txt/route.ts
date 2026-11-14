import { connection } from "next/server";

import { absoluteUrl, CONTACT_EMAIL } from "@/lib/site";

const DAY = 86_400_000;
const POLICY = "https://github.com/thecodeblock-hendrik/word-on-the-water/blob/main/SECURITY.md";

/**
 * security.txt (RFC 9116). Expires is worked out on each request, about a year ahead, so the file
 * never goes stale and nobody has to remember to renew it.
 */
export async function GET() {
  await connection();
  const expires = new Date((Math.floor(Date.now() / DAY) + 360) * DAY).toISOString();
  const body =
    [
      `Contact: mailto:${CONTACT_EMAIL}`,
      `Expires: ${expires}`,
      "Preferred-Languages: en",
      `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
      `Policy: ${POLICY}`,
    ].join("\n") + "\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
