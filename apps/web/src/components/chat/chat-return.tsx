"use client";

import { useSyncExternalStore } from "react";

import { ShoreButton } from "@/components/bible/shore-button";
import { RaisedBump } from "@/components/layout/raised-bump";
import { chat } from "@/content/chat";
import { openChat } from "@/lib/chat/open";
import { chatReturnUrl, clearChatReturn, subscribeChatReturn } from "@/lib/chat/return";

const nothing = () => null;

/**
 * The way back to the chat in the Bible reader (it opens the chat over the page, no navigation),
 * shown only to a visitor who came from the chat (a flag in this tab, so a shared link shows
 * nothing; everyone else gets the Shore button in the same place, from a phone up to lg). On a phone it sits in the pinned chapter bar between Previous and Next: a round button
 * with "Your chat" under it, inside a raised part of the bar whose top line curves around the
 * button. It is only 56px wide in the bar. From lg, where the chapter buttons sit under the text,
 * it is a tab fixed to the right edge at mid-height like a drawer handle (the chat opens from
 * there), which can be hidden.
 */
export function ChatReturn() {
  const url = useSyncExternalStore(subscribeChatReturn, chatReturnUrl, nothing);
  if (!url) return <ShoreButton />;
  return (
    <div
      data-chat-return
      data-bar-middle
      className="relative w-14 flex-none self-stretch lg:fixed lg:right-0 lg:top-1/2 lg:z-30 lg:w-12 lg:-translate-y-1/2 lg:self-auto lg:overflow-hidden lg:rounded-l-2xl lg:bg-ink lg:shadow-menu"
    >
      <RaisedBump
        data-chat-bump
        className="absolute left-1/2 top-[-37.5px] h-[30px] w-[104px] -translate-x-1/2 lg:hidden"
      />
      <button
        type="button"
        onClick={() => openChat(null)}
        className="font-ui text-xs font-bold leading-none text-ink max-lg:absolute max-lg:inset-0 lg:flex lg:min-h-[150px] lg:w-full lg:flex-col lg:items-center lg:justify-center lg:gap-2.5 lg:py-3 lg:text-sm lg:tracking-wide lg:text-bg lg:hover:bg-accent-ink"
      >
        <span className="grid place-items-center rounded-full bg-ink text-bg max-lg:absolute max-lg:left-1/2 max-lg:top-[-30px] max-lg:size-14 max-lg:-translate-x-1/2">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 flex-none lg:size-5">
            <path
              d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="max-lg:absolute max-lg:inset-x-0 max-lg:top-[29px] max-lg:text-center lg:[writing-mode:vertical-rl]">
          {chat.yourChat}
        </span>
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
