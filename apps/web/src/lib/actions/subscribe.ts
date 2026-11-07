"use server";

import { headers } from "next/headers";

import { apiFetch } from "@/lib/api-client";
import { clientIpFrom, parseSignup, submitSignup, valuesOf } from "@/lib/signup";
import type { SignupState } from "@/lib/signup-state";

/** The sign-up form's Server Action: check the fields, then hand the sign-up to the API. */
export async function subscribe(_previous: SignupState, form: FormData): Promise<SignupState> {
  const parsed = parseSignup(form);
  const state: SignupState = parsed.ok
    ? await submitSignup(parsed, clientIpFrom(await headers()), apiFetch)
    : { status: "error", fieldErrors: parsed.fieldErrors, message: parsed.message };
  return state.status === "error" ? { ...state, values: valuesOf(form) } : state;
}
