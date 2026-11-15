import { useId, type KeyboardEvent, type RefObject } from "react";

import { chat } from "@/content/chat";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  error: string | null;
  followUp: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

/** The question box: a visible privacy line, Enter to send, Shift+Enter for a new line. */
export function ChatInput({ value, onChange, onSend, error, followUp, inputRef }: Props) {
  const id = useId();
  const canSend = value.trim().length > 0;

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="grid gap-2 border-t border-line bg-bg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      <p id={`${id}-hint`} className="font-ui text-sm text-muted">
        {chat.privacy}
      </p>
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          {chat.inputLabel}
        </label>
        <textarea
          id={id}
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={`${id}-hint`}
          aria-invalid={error ? true : undefined}
          placeholder={followUp ? chat.followUpPlaceholder : chat.placeholder}
          className={`field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-md border-[1.5px] bg-surface px-3 py-2.5 font-ui text-base text-ink ${error ? "border-accent-ink" : "border-line"}`}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="inline-flex size-11 flex-none items-center justify-center rounded-md bg-accent-ink font-ui font-bold text-bg disabled:opacity-40"
        >
          <span className="sr-only">{chat.send}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
            <path
              d="M10 16V4M4 9l6-6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
      {error && (
        <p role="alert" className="font-ui text-sm font-medium text-accent-ink">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
