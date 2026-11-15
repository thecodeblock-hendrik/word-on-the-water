"use server";

import { headers } from "next/headers";

import { apiFetch } from "@/lib/api-client";
import { isChatEnabled } from "@/lib/chat/flag";
import { submitChat, type ChatInput, type ChatResult } from "@/lib/chat/submit";
import { clientIpFrom } from "@/lib/signup";

/** The chat's Server Action: hands one turn to the API. Nothing is stored or logged here. */
export async function sendChat(input: ChatInput): Promise<ChatResult> {
  if (!isChatEnabled()) {
    return { ok: false, message: "Got Questions is not available right now." };
  }
  return submitChat(input, clientIpFrom(await headers()), apiFetch);
}
