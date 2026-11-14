import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { isBibleEnabled } from "@/lib/bible/flag";
import { readHref } from "@/lib/bible/picker";
import { parsePassage, parseVersion, PASSAGE_COOKIE, VERSION_COOKIE } from "@/lib/bible/remember";

/**
 * Resumes where you left off, in the Bible you read last. A first visit, or a cookie that cannot
 * be read, opens John 3:16 in the BSB.
 */
export default async function BiblePage() {
  if (!isBibleEnabled()) notFound();
  const jar = await cookies();
  const version = parseVersion(jar.get(VERSION_COOKIE)?.value);
  const passage = parsePassage(jar.get(PASSAGE_COOKIE)?.value);
  redirect(readHref({ version, ...passage }));
}
