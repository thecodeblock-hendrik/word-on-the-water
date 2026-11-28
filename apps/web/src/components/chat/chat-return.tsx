"use client";

import { useSyncExternalStore } from "react";

import { ShoreButton } from "@/components/bible/shore-button";
import { glassTab, glassTabIcon } from "@/components/layout/glass-tab";
import { chat } from "@/content/chat";
import { openChat } from "@/lib/chat/open";
import { chatReturnUrl, clearChatReturn, subscribeChatReturn } from "@/lib/chat/return";

const nothing = () => null;

/**
 * The way back to the chat in the Bible reader (it opens the chat over the page, no navigation),
 * shown only to a visitor who came from the chat (a flag in this tab, so a shared link shows
 * nothing; everyone else gets Shore in the same place). Below lg it is the middle tab of the
 * glass capsule. From lg, where the chapter buttons sit under the text, it is a tab fixed to the
 * right edge at mid-height like a drawer handle (the chat opens from there), which can be hidden.
 */
export function ChatReturn() {
  const url = useSyncExternalStore(subscribeChatReturn, chatReturnUrl, nothing);
  if (!url) return <ShoreButton />;
  return (
    <div
      data-chat-return
      className="flex min-w-0 flex-1 lg:fixed lg:right-0 lg:top-1/2 lg:z-30 lg:block lg:w-12 lg:flex-none lg:-translate-y-1/2 lg:overflow-hidden lg:rounded-l-2xl lg:bg-ink lg:shadow-menu"
    >
      <button
        type="button"
        onClick={() => openChat(null)}
        className={`${glassTab} lg:min-h-[150px] lg:w-full lg:gap-2.5 lg:whitespace-normal lg:rounded-none lg:py-3 lg:text-sm lg:font-bold lg:leading-none lg:tracking-wide lg:text-bg lg:hover:bg-accent-ink`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`${glassTabIcon} flex-none lg:size-5`}
        >
          <path
            d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            fill="currentColor"
          />
        </svg>
        <span className="lg:[writing-mode:vertical-rl]">{chat.yourChat}</span>
      </button>
      <button
        type="button"
        onClick={clearChatReturn}
        aria-label={chat.hideYourChat}
        className="hidden min-h-11 w-full items-center justify-center border-t border-bg/40 text-bg hover:bg-accent-ink lg:flex"
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
