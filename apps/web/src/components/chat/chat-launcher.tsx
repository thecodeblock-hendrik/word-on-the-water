"use client";

import type { MouseEvent, ReactNode, RefObject } from "react";

import { chat } from "@/content/chat";
import { openChat } from "@/lib/chat/open";

/**
 * An Ask the Word link: a mail link without JavaScript; with it, a click asks the page's ChatHost
 * to open the chat. Safari does not focus a clicked link, so the opener is named explicitly.
 */
export function ChatLauncher({
  className,
  children = chat.title,
  returnFocusTo,
  onActivate,
}: {
  className: string;
  children?: ReactNode;
  /** Where focus goes when the chat closes, if not this link (a menu item is gone by then). */
  returnFocusTo?: RefObject<HTMLElement | null>;
  /** Called when the link opens the chat, for example to close a menu. */
  onActivate?: () => void;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openChat(returnFocusTo?.current ?? event.currentTarget);
    onActivate?.();
  }

  return (
    <a href={`mailto:${chat.mail}`} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
