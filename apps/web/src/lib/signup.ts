import { isIP } from "node:net";
import { z } from "zod";

import type { ApiOptions } from "@/lib/api-client";
import type { SignupState } from "@/lib/signup-state";

/** The wording the visitor agreed to; bump it when the text beside the button changes. */
export const CONSENT_TEXT_VERSION = "v1";

type Post = (path: string, options: ApiOptions) => Promise<Response>;

export type SignupBody = {
  email: string;
  first_name: string | null;
  source: string;
  consent_text_version: string;
  website: string;
  rendered_at: number;
  turnstile_token: string;
};

export type ParsedSignup =
  | { ok: true; data: SignupBody; idempotencyKey: string }
  | { ok: false; fieldErrors: { email?: string; firstName?: string } };

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

const email = z.email().max(254);
const firstName = z.string().max(80);

/** Checks what a person can fix; everything else is left to the API, which has the last word. */
export function parseSignup(form: FormData): ParsedSignup {
  const emailValue = text(form, "email").trim();
  const nameValue = text(form, "first_name").trim();
  const fieldErrors: { email?: string; firstName?: string } = {};
  if (!email.safeParse(emailValue).success) fieldErrors.email = "Enter a valid email address.";
  if (!firstName.safeParse(nameValue).success)
    fieldErrors.firstName = "Use 80 characters or fewer.";
  if (fieldErrors.email || fieldErrors.firstName) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      email: emailValue,
      first_name: nameValue || null,
      source: text(form, "source"),
      consent_text_version: CONSENT_TEXT_VERSION,
      website: text(form, "website"),
      rendered_at: Number(text(form, "rendered_at")),
      turnstile_token: text(form, "cf-turnstile-response"),
    },
    idempotencyKey: text(form, "idempotency_key"),
  };
}

const unavailable: SignupState = {
  status: "error",
  message: "Sign-up is not available right now. Please try again in a few minutes.",
};

/** Sends the sign-up to the API and turns its answer into something to show. Never returns the address. */
export async function submitSignup(
  parsed: Extract<ParsedSignup, { ok: true }>,
  clientIp: string | undefined,
  post: Post,
): Promise<SignupState> {
  let response: Response;
  try {
    response = await post("/v1/subscribers", {
      method: "POST",
      body: parsed.data,
      clientIp,
      idempotencyKey: parsed.idempotencyKey,
    });
  } catch {
    return unavailable;
  }
  if (response.status === 202) return { status: "success" };
  if (response.status === 400) {
    return { status: "error", message: "The check did not pass. Please try again." };
  }
  if (response.status === 422) {
    return { status: "error", message: "Please check your details and try again." };
  }
  if (response.status === 429) {
    return {
      status: "error",
      message: "Too many sign-ups from here. Please try again in an hour.",
    };
  }
  return unavailable;
}

/** The visitor's address as Vercel reports it, or undefined when it is missing or not an address. */
export function clientIpFrom(headers: Headers): string | undefined {
  const candidate =
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  return isIP(candidate) ? candidate : undefined;
}
