import { notFound, redirect } from "next/navigation";

import { isBibleEnabled } from "@/lib/bible/flag";
import { DEFAULT_VERSION } from "@/lib/bible/versions";

export default function BiblePage() {
  if (!isBibleEnabled()) notFound();
  redirect(`/bible/${DEFAULT_VERSION}/john/1`);
}
