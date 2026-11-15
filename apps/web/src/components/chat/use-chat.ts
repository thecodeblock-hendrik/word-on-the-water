"use client";

import { useEffect, useState } from "react";

import { chat } from "@/content/chat";
import { sendChat } from "@/lib/actions/chat";
import { clearThread, loadThread, saveThread } from "@/lib/chat/storage";
import type { ChatTurn } from "@/lib/chat/submit";
import { addReply, addVisitor, buildContext, type Thread } from "@/lib/chat/thread";

const errors: Record<string, string> = chat.errors;

/**
 * The conversation state. The thread is kept in this tab only. A message is shown while it is
 * sent but saved only once answered, so a refused message (personal details) is never stored.
 */
export function useChat() {
  const [thread, setThread] = useState<Thread>(loadThread);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [renderedAt] = useState(() => Date.now());

  useEffect(() => {
    if (thread.length > 0) saveThread(thread);
    else clearThread();
  }, [thread]);

  /** Sends one turn. Returns an error message to show, or null when it was answered. */
  async function ask(turn: ChatTurn, display: string): Promise<string | null> {
    setOutgoing(display);
    const result = await sendChat({
      turn,
      context: buildContext(thread),
      renderedAt,
      website: "",
    });
    setOutgoing(null);
    if (!result.ok) return result.message;
    if (result.reply.kind === "rejected") {
      return errors[result.reply.reason ?? ""] ?? chat.errors.generic;
    }
    setThread(addReply(addVisitor(thread, display), result.reply));
    return null;
  }

  return {
    thread,
    shown: outgoing === null ? thread : addVisitor(thread, outgoing),
    pending: outgoing !== null,
    ask,
    clear: () => setThread([]),
  };
}
