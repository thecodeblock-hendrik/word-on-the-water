import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

/** Closing call to action. The sign-up form itself arrives with step 1.3. */
export function SubscribeBand() {
  return (
    <section className="bg-deep text-on-deep">
      <div className="mx-auto grid max-w-[1080px] items-center gap-8 py-12 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:grid-cols-2">
        <div>
          <h2 className="font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold uppercase leading-[1.05] tracking-[.04em]">
            One devotional. Every Saturday at dawn.
          </h2>
          <p className="mt-2.5 font-ui text-[15.5px] text-on-deep-muted">
            The full devotional lands in your inbox. Free, and you can unsubscribe anytime.
          </p>
        </div>
        <div>
          <Link href="/#subscribe" className={buttonClasses("primary-on-deep")}>
            Subscribe
          </Link>
        </div>
      </div>
    </section>
  );
}
