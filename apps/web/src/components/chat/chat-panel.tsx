"use client";

import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { Chip } from "@/components/chat/chip";
import { TopicBrowser } from "@/components/chat/topic-browser";
import { MessageList } from "@/components/chat/message-list";
import { useChat } from "@/components/chat/use-chat";
import { chat } from "@/content/chat";
import type { ChatTurn } from "@/lib/chat/submit";

const headerButton =
  "inline-flex min-h-11 items-center justify-center rounded-sm px-3 font-ui text-[15px] font-semibold text-ink";

/**
 * Got Questions: a right-hand drawer from lg, a full-height sheet below. Chips send entry ids, so
 * they always work; typed text goes through the API's guards. Loaded on first use.
 */
export function ChatPanel({
  open,
  onOpenChange,
  bibleLinks = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Link key verses to the Bible reader (only when it is switched on). */
  bibleLinks?: boolean;
}) {
  const { thread, shown, pending, ask, clear } = useChat();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [shown]);

  async function send(turn: ChatTurn, display: string, restore?: string) {
    setError(null);
    const failure = await ask(turn, display);
    setError(failure);
    if (failure && restore !== undefined) setText(restore);
    input.current?.focus();
  }

  function sendTyped() {
    const message = text.trim();
    if (!message || pending) return;
    setText("");
    void send({ message }, message, text);
  }

  const askEntry = (id: string, question: string) => {
    setBrowsing(false);
    void send({ entry_id: id }, question);
  };
  const actions = {
    onAsk: askEntry,
    onBrowse: () => setBrowsing(true),
    onMore: () => void send({ action: "more" }, "Tell me more"),
    onTerm: (term: string) => void send({ action: "term", term }, term),
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-testid="chat-overlay" className="fixed inset-0 z-50 bg-deep/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            opener.current = document.activeElement as HTMLElement | null;
            input.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="fixed inset-0 z-50 flex h-dvh flex-col bg-bg pt-[env(safe-area-inset-top)] shadow-menu lg:left-auto lg:w-[28rem] lg:border-l lg:border-line"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
            <Dialog.Title className="font-display text-xl font-semibold uppercase tracking-[.05em]">
              {chat.title}
            </Dialog.Title>
            <div className="flex items-center">
              {thread.length > 0 && (
                <button type="button" onClick={clear} className={headerButton}>
                  {chat.clear}
                </button>
              )}
              <Dialog.Close aria-label={chat.close} className={`${headerButton} size-11`}>
                <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
                  <path
                    d="M4 4l12 12M16 4L4 16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </Dialog.Close>
            </div>
          </div>
          <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4">
            {browsing ? (
              <TopicBrowser onAsk={askEntry} onBack={() => setBrowsing(false)} />
            ) : (
              <>
                {shown.length === 0 && (
                  <div className="grid gap-3">
                    <p>
                      <strong>{chat.intro}</strong> {chat.introNote}
                    </p>
                    <span className="font-ui text-xs font-semibold uppercase tracking-[.12em] text-muted">
                      {chat.starterLabel}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {chat.starters.map((s) => (
                        <Chip key={s.id} onClick={() => askEntry(s.id, s.question)}>
                          {s.question}
                        </Chip>
                      ))}
                    </div>
                    <Chip onClick={actions.onBrowse} className="w-fit">
                      {chat.browse} ›
                    </Chip>
                  </div>
                )}
                <MessageList
                  thread={shown}
                  pending={pending}
                  actions={actions}
                  bibleLinks={bibleLinks}
                />
              </>
            )}
          </div>
          <ChatInput
            value={text}
            onChange={setText}
            onSend={sendTyped}
            error={error}
            followUp={thread.length > 0}
            inputRef={input}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
