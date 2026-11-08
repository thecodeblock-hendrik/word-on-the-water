import { getEnv } from "@/lib/env";
import { forwardKitWebhook } from "@/lib/kit-webhook";

/** Kit's webhook address: forwards to the API, which checks the signature (see lib/kit-webhook). */
export async function POST(request: Request) {
  return forwardKitWebhook(request, getEnv());
}
