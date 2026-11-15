"use client";

import { lazy, Suspense, useState, type MouseEvent } from "react";

import { chat } from "@/content/chat";

// The panel is a separate chunk, fetched on the first click, so the landing page JS stays small.
const ChatPanel = lazy(() =>
  import("@/components/chat/chat-panel").then((m) => ({ default: m.ChatPanel })),
);

/**
 * The Got Questions button. A mail link without JavaScript; with it, a click opens the chat.
 * Once opened the panel stays mounted, so the conversation is not rebuilt on every open.
 */
export function ChatLauncher({
  className,
  bibleLinks = false,
}: {
  className: string;
  bibleLinks?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function onClick(event: MouseEvent) {
    event.preventDefault();
    setLoaded(true);
    setOpen(true);
  }

  return (
    <>
      <a href={`mailto:${chat.mail}`} onClick={onClick} className={className}>
        {chat.title}
      </a>
      {loaded && (
        <Suspense fallback={null}>
          <ChatPanel open={open} onOpenChange={setOpen} bibleLinks={bibleLinks} />
        </Suspense>
      )}
    </>
  );
}
