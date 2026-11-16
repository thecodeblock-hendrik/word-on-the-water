"use client";

import { useSyncExternalStore } from "react";

import { chat } from "@/content/chat";
import { openChat } from "@/lib/chat/open";
import { chatReturnUrl, clearChatReturn, subscribeChatReturn } from "@/lib/chat/return";

const nothing = () => null;

/**
 * The way back to the chat in the Bible reader (it opens the chat over the page, no navigation),
 * shown only to a visitor who came from the chat (a flag in this tab, so a shared link shows
 * nothing). It is rendered inside the passage heading (`Reader`'s `aside`). On a phone it is an ink
 * tab on the right edge of the screen, from the version name down to the verses line: always at the
 * top, never over the text (the heading keeps room for it), and no space taken from the chapter bar.
 * From lg, where the chapter buttons sit under the text, it is a tab fixed to the right edge at
 * mid-height like a drawer handle, which can be hidden.
 */
export function ChatReturn() {
  const url = useSyncExternalStore(subscribeChatReturn, chatReturnUrl, nothing);
  if (!url) return null;
  return (
    <div
      data-chat-return
      className="flex flex-col items-stretch overflow-hidden rounded-l-xl bg-ink text-bg shadow-menu max-lg:absolute max-lg:inset-y-0 max-lg:-right-4 max-lg:w-11 lg:fixed lg:right-0 lg:top-1/2 lg:z-30 lg:w-12 lg:-translate-y-1/2 lg:rounded-l-2xl"
    >
      <button
        type="button"
        onClick={() => openChat(null)}
        className="flex flex-1 flex-col items-center justify-center gap-2 py-3 font-ui text-sm font-bold tracking-wide hover:bg-accent-ink lg:min-h-[150px] lg:gap-2.5"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 flex-none">
          <path
            d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            fill="currentColor"
          />
        </svg>
        <span className="[writing-mode:vertical-rl]">{chat.yourChat}</span>
      </button>
      <button
        type="button"
        onClick={clearChatReturn}
        aria-label={chat.hideYourChat}
        className="hidden min-h-11 items-center justify-center border-t border-bg/40 text-bg hover:bg-accent-ink lg:flex"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
          <path
            d="M4 4l12 12M16 4L4 16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
