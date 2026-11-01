import { connection } from "next/server";

/** TEMPORARY: proves an error reaches Sentry scrubbed. Remove before merge. */
export async function GET() {
  await connection();
  throw new Error("sentry test for jo" + "@example.com");
}
