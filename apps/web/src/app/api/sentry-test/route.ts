import { connection } from "next/server";

import { apiFetch } from "@/lib/api-client";

/** TEMPORARY: proves an error reaches Sentry scrubbed in web and API. Remove before merge. */
export async function GET() {
  await connection();
  await apiFetch("/v1/sentry-test");
  throw new Error("sentry test for jo" + "@example.com");
}
