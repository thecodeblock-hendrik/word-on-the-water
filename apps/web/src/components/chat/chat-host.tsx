"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { warmChat } from "@/lib/actions/chat";
import { OPEN_CHAT } from "@/lib/chat/open";
import { cameBackByHistory, chatReturnUrl, clearChatReturn } from "@/lib/chat/return";

// The panel is a separate chunk, fetched on the first request to open it, so page JS stays small.
const ChatPanel = lazy(() =>
  import("@/components/chat/chat-panel").then((m) => ({ default: m.ChatPanel })),
);

/**
 * The one Got Questions panel on the page, opened by any ChatLauncher (the menu bar, the mobile
 * menu, the Start here button). Once opened it stays mounted, so the conversation is not rebuilt.
 */
export function ChatHost({
  bibleLinks = false,
  devotionalHref,
}: {
  bibleLinks?: boolean;
  devotionalHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const warmed = useRef(false);

  useEffect(() => {
    function onOpen(event: Event) {
      opener.current = (event as CustomEvent<HTMLElement | null>).detail;
      clearChatReturn();
      if (!warmed.current) {
        warmed.current = true;
        void warmChat();
      }
      setLoaded(true);
      setOpen(true);
    }
    window.addEventListener(OPEN_CHAT, onOpen);

    // The browser's Back button returning to the page the chat was on.
    const backOnChatPage =
      cameBackByHistory() && chatReturnUrl() === `${location.pathname}${location.search}`;
    if (backOnChatPage) {
      clearChatReturn();
      onOpen(new CustomEvent(OPEN_CHAT, { detail: null }));
    }
    return () => window.removeEventListener(OPEN_CHAT, onOpen);
  }, []);

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <ChatPanel
        open={open}
        onOpenChange={setOpen}
        bibleLinks={bibleLinks}
        devotionalHref={devotionalHref}
        returnFocusTo={opener}
      />
    </Suspense>
  );
}
