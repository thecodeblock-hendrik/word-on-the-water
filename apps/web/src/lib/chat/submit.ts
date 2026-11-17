import type { ApiOptions } from "@/lib/api-client";
import { parseReply, type ChatContext, type ChatReply } from "@/lib/chat/thread";

type Post = (path: string, options: ApiOptions) => Promise<Response>;

/** One visitor action: free text, a chip that names an entry, or a button. */
export type ChatTurn =
  | { message: string }
  | { entry_id: string }
  | { action: "more" | "related" }
  | { action: "term"; term: string };

export type ChatInput = {
  turn: ChatTurn;
  context: ChatContext;
  /** When the panel was drawn (milliseconds): a message sent too fast is a bot. */
  renderedAt: number;
  /** The hidden field a person leaves empty. */
  website: string;
};

export type ChatResult = { ok: true; reply: ChatReply } | { ok: false; message: string };

const unavailable = {
  ok: false,
  message:
    "Got Questions is not available right now. Please try again later, or email hello@wordonthewater.net.",
} as const;
const wrong = { ok: false, message: "Something went wrong. Please try again." } as const;
const tooMany = {
  ok: false,
  message: "You have asked a lot of questions. Please try again in a few minutes.",
} as const;

/** Sends one turn to the API and turns its answer into a reply to show. Errors never carry the message. */
export async function submitChat(
  input: ChatInput,
  clientIp: string | undefined,
  post: Post,
): Promise<ChatResult> {
  let response: Response;
  try {
    response = await post("/v1/chat/messages", {
      method: "POST",
      clientIp,
      body: {
        ...input.turn,
        context: input.context,
        rendered_at: input.renderedAt,
        website: input.website,
      },
    });
  } catch {
    return unavailable;
  }
  if (response.status === 429) return tooMany;
  if (response.status === 422) return wrong;
  if (response.status !== 200) return unavailable;
  const parsed = parseReply(await response.json().catch(() => null));
  return parsed.success ? { ok: true, reply: parsed.data } : wrong;
}

/**
 * Wakes the API function with a cheap call. Both functions sleep when idle and the first request
 * after a pause is slow; calling this when the chat opens moves that wait out of the first question.
 */
export async function warmApi(post: Post): Promise<void> {
  try {
    await post("/health/live", {});
  } catch {
    // Nobody waits for this, and a real question will report any failure.
  }
}
