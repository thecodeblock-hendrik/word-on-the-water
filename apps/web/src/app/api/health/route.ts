import { connection } from "next/server";

export async function GET() {
  // Without this the response is prerendered at build time and would not prove the function is alive.
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
