"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { warmChat } from "@/lib/actions/chat";
import { type Cleared, dropCleared } from "@/lib/chat/cleared";
import { OPEN_CHAT, RESTORE_CHAT } from "@/lib/chat/open";
import { cameBackByHistory, chatReturnUrl, clearChatReturn } from "@/lib/chat/return";

// The panel is a separate chunk, fetched on the first request to open it, so page JS stays small.
const ChatPanel = lazy(() =>
  import("@/components/chat/chat-panel").then((m) => ({ default: m.ChatPanel })),
);

/**
 * The one Ask the Word panel on the page, opened by any ChatLauncher (the menu bar, the mobile
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
  const [restored, setRestored] = useState<{ count: number } & Partial<Cleared>>({ count: 0 });
  const opener = useRef<HTMLElement | null>(null);
  const warmed = useRef(false);

  useEffect(() => {
    function onOpen(event: Event) {
      opener.current = (event as CustomEvent<HTMLElement | null>).detail;
      clearChatReturn();
      dropCleared();
      if (!warmed.current) {
        warmed.current = true;
        void warmChat();
      }
      setLoaded(true);
      setOpen(true);
    }
    window.addEventListener(OPEN_CHAT, onOpen);

    // Undo: the panel is rebuilt around the chat that was cleared.
    function onRestore(event: Event) {
      const { thread, draft } = (event as CustomEvent<Cleared>).detail;
      opener.current = null;
      clearChatReturn();
      setRestored((r) => ({ count: r.count + 1, thread, draft }));
      setLoaded(true);
      setOpen(true);
    }
    window.addEventListener(RESTORE_CHAT, onRestore);

    // The browser's Back button returning to the page the chat was on.
    const backOnChatPage =
      cameBackByHistory() && chatReturnUrl() === `${location.pathname}${location.search}`;
    if (backOnChatPage) {
      clearChatReturn();
      onOpen(new CustomEvent(OPEN_CHAT, { detail: null }));
    }
    return () => {
      window.removeEventListener(OPEN_CHAT, onOpen);
      window.removeEventListener(RESTORE_CHAT, onRestore);
    };
  }, []);

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <ChatPanel
        key={restored.count}
        initialThread={restored.thread}
        initialDraft={restored.draft}
        open={open}
        onOpenChange={setOpen}
        bibleLinks={bibleLinks}
        devotionalHref={devotionalHref}
        returnFocusTo={opener}
      />
    </Suspense>
  );
}
