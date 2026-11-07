import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { thankYou } from "@/content/landing";
import { today } from "@/lib/devotionals/format";
import { featured, loadContent } from "@/lib/devotionals/load";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

/** Where Kit sends a subscriber after they confirm their email. */
export default function ThankYou() {
  const latest = featured(loadContent().devotionals, today())!;
  return (
    <section className="mx-auto max-w-[1080px] py-16 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <h1 className="font-display text-[clamp(2.2rem,7vw,3.4rem)] font-semibold uppercase leading-[1.05] tracking-[.03em] text-balance">
        {thankYou.heading}
      </h1>
      <p className="mt-4 max-w-[62ch] text-muted">{thankYou.body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/devotionals/${latest.slug}`} className={buttonClasses("primary")}>
          Read the latest devotional
        </Link>
        <Link href="/" className={buttonClasses("outline")}>
          Back to the home page
        </Link>
      </div>
    </section>
  );
}
