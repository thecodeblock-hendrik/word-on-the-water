"use client";

import { useSyncExternalStore } from "react";

import { chat } from "@/content/chat";
import {
  chatReturnUrl,
  clearChatReturn,
  requestReopen,
  subscribeChatReturn,
} from "@/lib/chat/return";

const nothing = () => null;

/**
 * A floating "Your chat" button for the Bible reader, shown only to a visitor who came from the
 * chat (a flag in this tab, so a shared link shows nothing). It stays while they read and turn
 * chapters; on a phone it rides on the sticky chapter bar, so it never covers the buttons; from lg it is fixed at the bottom right. It can be hidden.
 */
export function ChatReturn() {
  const url = useSyncExternalStore(subscribeChatReturn, chatReturnUrl, nothing);
  if (!url) return null;
  return (
    <div className="absolute bottom-full right-4 z-30 mb-3 flex items-center gap-1 lg:fixed lg:bottom-6 lg:right-6 lg:mb-0">
      <a
        href={url}
        onClick={requestReopen}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-accent-ink bg-accent-ink px-5 font-ui text-[15px] font-bold text-bg shadow-menu hover:brightness-110"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 flex-none">
          <path
            d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            fill="currentColor"
          />
        </svg>
        {chat.yourChat}
      </a>
      <button
        type="button"
        onClick={clearChatReturn}
        aria-label={chat.hideYourChat}
        className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-surface text-ink shadow-menu"
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
