import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { isBibleEnabled } from "@/lib/bible/flag";
import { parseVersion, VERSION_COOKIE } from "@/lib/bible/remember";

/** Opens John 3:16 in the Bible you read last (the BSB if you have not read one yet). */
export default async function BiblePage() {
  if (!isBibleEnabled()) notFound();
  const version = parseVersion((await cookies()).get(VERSION_COOKIE)?.value);
  redirect(`/bible/${version}/john/3?v=16`);
}
