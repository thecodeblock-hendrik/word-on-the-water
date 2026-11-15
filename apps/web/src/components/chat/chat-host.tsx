"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { OPEN_CHAT } from "@/lib/chat/open";

// The panel is a separate chunk, fetched on the first request to open it, so page JS stays small.
const ChatPanel = lazy(() =>
  import("@/components/chat/chat-panel").then((m) => ({ default: m.ChatPanel })),
);

/**
 * The one Got Questions panel on the page, opened by any ChatLauncher (the menu bar, the mobile
 * menu, the Start here button). Once opened it stays mounted, so the conversation is not rebuilt.
 */
export function ChatHost({ bibleLinks = false }: { bibleLinks?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      opener.current = (event as CustomEvent<HTMLElement | null>).detail;
      setLoaded(true);
      setOpen(true);
    }
    window.addEventListener(OPEN_CHAT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT, onOpen);
  }, []);

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <ChatPanel
        open={open}
        onOpenChange={setOpen}
        bibleLinks={bibleLinks}
        returnFocusTo={opener}
      />
    </Suspense>
  );
}
