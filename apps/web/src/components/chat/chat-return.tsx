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
 * The way back to the chat in the Bible reader, shown only to a visitor who came from the chat (a
 * flag in this tab, so a shared link shows nothing). On a phone it is a round button in the middle
 * of the pinned chapter bar, between Previous and Next, rising above the bar with "Your chat" under
 * it. From lg, where the chapter buttons sit under the text, it is a pill fixed at the bottom
 * right, which can be hidden.
 */
export function ChatReturn() {
  const url = useSyncExternalStore(subscribeChatReturn, chatReturnUrl, nothing);
  if (!url) return null;
  return (
    <div
      data-chat-return
      className="-mt-8 flex flex-none items-center gap-1 lg:fixed lg:bottom-6 lg:right-6 lg:z-30 lg:mt-0"
    >
      <a
        href={url}
        onClick={requestReopen}
        className="flex flex-col items-center gap-0.5 font-ui text-[11px] font-bold leading-none text-ink lg:min-h-12 lg:flex-row lg:gap-2 lg:rounded-full lg:border-[1.5px] lg:border-accent-ink lg:bg-accent-ink lg:px-5 lg:text-[15px] lg:text-bg lg:shadow-menu lg:hover:brightness-110"
      >
        <span className="grid size-[60px] place-items-center rounded-full border-[3px] border-surface bg-ink text-bg shadow-menu lg:size-auto lg:border-0 lg:bg-transparent lg:shadow-none">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 flex-none lg:size-5">
            <path
              d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
              fill="currentColor"
            />
          </svg>
        </span>
        {chat.yourChat}
      </a>
      <button
        type="button"
        onClick={clearChatReturn}
        aria-label={chat.hideYourChat}
        className="hidden size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-surface text-ink shadow-menu lg:inline-flex"
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
