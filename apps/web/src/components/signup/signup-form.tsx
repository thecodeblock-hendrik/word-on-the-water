"use client";

import Script from "next/script";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { signup } from "@/content/landing";
import { subscribe } from "@/lib/actions/subscribe";
import { idleSignup, type SignupState } from "@/lib/signup-state";

type Props = {
  /** Where the form is, as a short label such as `landing_closing`. */
  source: string;
  /** When the server drew the form (milliseconds): a form sent too fast is a bot. */
  renderedAt: number;
  /** One per page drawn: a repeat of the same post does nothing. */
  idempotencyKey: string;
  /** The public Cloudflare Turnstile site key; without it the form is not shown. */
  siteKey: string | undefined;
};

const label = "block font-ui text-sm font-medium text-on-deep";

/**
 * The email sign-up. The Server Action sends it to the API; the API checks the spam trap, the time
 * and Turnstile, then Kit sends the confirmation email. React clears a form after its action, so
 * the typed values come back from the action and a used Turnstile token is replaced.
 */
export function SignupForm({ source, renderedAt, idempotencyKey, siteKey }: Props) {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(subscribe, idleSignup);
  const error = state.status === "error" ? state : undefined;

  useEffect(() => {
    if (state.status === "error" && state.tokenUsed) {
      (window as { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
  }, [state]);

  if (!siteKey) return <p className="font-ui text-on-deep-muted">{signup.unavailable}</p>;

  if (state.status === "success") {
    return (
      <div role="status" className="grid gap-1.5">
        <p className="font-display text-xl font-semibold uppercase tracking-[.05em]">
          {signup.success.heading}
        </p>
        <p className="font-ui text-[15.5px] text-on-deep-muted">{signup.success.body}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label htmlFor="signup-email" className={label}>
          {signup.emailLabel}
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={error?.values?.email}
          invalid={!!error?.fieldErrors?.email}
          aria-describedby={error?.fieldErrors?.email ? "signup-email-error" : undefined}
        />
        <FieldError id="signup-email-error">{error?.fieldErrors?.email}</FieldError>
      </div>
      <div>
        <label htmlFor="signup-name" className={label}>
          {signup.nameLabel}
        </label>
        <Input
          id="signup-name"
          name="first_name"
          autoComplete="given-name"
          defaultValue={error?.values?.firstName}
          invalid={!!error?.fieldErrors?.firstName}
          aria-describedby={error?.fieldErrors?.firstName ? "signup-name-error" : undefined}
        />
        <FieldError id="signup-name-error">{error?.fieldErrors?.firstName}</FieldError>
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="rendered_at" value={renderedAt} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />

      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-appearance="interaction-only"
        data-theme="auto"
      />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />

      <div role="alert" className="font-ui text-sm text-on-deep empty:hidden">
        {error?.message}
      </div>
      <Button type="submit" variant="primary-on-deep" busy={pending}>
        {signup.button}
      </Button>
      <p className="font-ui text-[13px] text-on-deep-muted">{signup.consent}</p>
      <noscript>
        <p className="font-ui text-sm text-on-deep">{signup.noScript}</p>
      </noscript>
    </form>
  );
}
