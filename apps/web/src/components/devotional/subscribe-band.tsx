import { SignupForm } from "@/components/signup/signup-form";
import { signup } from "@/content/landing";
import { drawSignup } from "@/lib/signup-draw";

/**
 * The closing band with the email sign-up: the `#subscribe` every Subscribe button links to. The
 * page renders per request, so the drawn time and the idempotency key are fresh for each visit.
 */
export function SubscribeBand({ source }: { source: string }) {
  const { renderedAt, idempotencyKey } = drawSignup();
  return (
    <section id="subscribe" aria-labelledby="subscribe-h" className="bg-deep text-on-deep">
      <div className="mx-auto grid max-w-[1080px] items-start gap-8 py-12 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:grid-cols-2">
        <div>
          <h2
            id="subscribe-h"
            className="font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold uppercase leading-[1.05] tracking-[.04em]"
          >
            {signup.heading}
          </h2>
          <p className="mt-2.5 font-ui text-[15.5px] text-on-deep-muted">{signup.lede}</p>
        </div>
        <SignupForm
          source={source}
          renderedAt={renderedAt}
          idempotencyKey={idempotencyKey}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        />
      </div>
    </section>
  );
}
