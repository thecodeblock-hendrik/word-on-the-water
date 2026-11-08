import "server-only";

import type { Env } from "@/lib/env";

const TIMEOUT_MS = 10_000;
/** Matches the API's limit for this path: a delivery of 100 events is about 25 KB. */
const MAX_BYTES = 1_048_576;

const noStore = { "Cache-Control": "no-store" };

/**
 * Passes a Kit webhook delivery on to the API untouched.
 *
 * Kit cannot get past the API project's Vercel login wall, so it calls this site and this
 * function adds the bypass secret on the server. The signature is checked by the API over the
 * exact bytes, so the body is never decoded or re-serialised. No service token is sent: the
 * signature is the credential. The API's answer is relayed as a bare status so Kit retries
 * failures (and so nothing from the API reaches the caller).
 */
export async function forwardKitWebhook(
  request: Request,
  env: Pick<Env, "API_BASE_URL" | "API_BYPASS_SECRET">,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new Response(null, { status: 413, headers: noStore });

  const headers = new Headers({
    "Content-Type": request.headers.get("content-type") ?? "application/json",
  });
  const signature = request.headers.get("x-kit-signature");
  if (signature) headers.set("X-Kit-Signature", signature);
  if (env.API_BYPASS_SECRET) headers.set("x-vercel-protection-bypass", env.API_BYPASS_SECRET);

  try {
    const response = await fetchImpl(`${env.API_BASE_URL}/v1/webhooks/kit`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new Response(null, { status: response.status, headers: noStore });
  } catch {
    return new Response(null, { status: 502, headers: noStore });
  }
}
