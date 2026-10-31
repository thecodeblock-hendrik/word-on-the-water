import { connection } from "next/server";

import { apiFetch } from "@/lib/api-client";

/** Reports ok only when the API, and through it the database and Redis, is ready. */
export async function GET() {
  // Without this the response is prerendered at build time and would not prove the function is alive.
  await connection();
  const ready = await apiFetch("/health/ready").then(
    (response) => response.ok,
    () => false,
  );
  return Response.json(
    { status: ready ? "ok" : "unavailable" },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
