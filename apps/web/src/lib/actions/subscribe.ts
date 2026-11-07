"use server";

import { headers } from "next/headers";

import { apiFetch } from "@/lib/api-client";
import { clientIpFrom, parseSignup, submitSignup } from "@/lib/signup";
import type { SignupState } from "@/lib/signup-state";

/** The sign-up form's Server Action: check the fields, then hand the sign-up to the API. */
export async function subscribe(_previous: SignupState, form: FormData): Promise<SignupState> {
  const parsed = parseSignup(form);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };
  return submitSignup(parsed, clientIpFrom(await headers()), apiFetch);
}
