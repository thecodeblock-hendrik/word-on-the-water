import { useState } from "react";

import { Chip } from "@/components/chat/chip";
import topics from "@/content/chat-topics.json";

const row =
  "flex min-h-11 w-full items-center justify-between border-b border-line py-2 text-left font-ui text-[17px] font-medium text-ink";

/** The 14 themes, then a theme's questions. Back steps out one level; a question sends its id. */
export function TopicBrowser({
  onAsk,
  onBack,
}: {
  onAsk: (entryId: string, question: string) => void;
  onBack: () => void;
}) {
  const [number, setNumber] = useState<number | null>(null);
  const topic = topics.find((t) => t.number === number);

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => (topic ? setNumber(null) : onBack())}
        className="min-h-11 w-fit font-ui text-[15px] font-semibold text-accent-ink"
      >
        ‹ Back
      </button>
      <h3 className="font-display text-xl font-semibold uppercase tracking-[.05em]">
        {topic ? topic.name : "Topics"}
      </h3>
      {topic ? (
        <div className="flex flex-col items-stretch gap-2">
          {topic.entries.map((e) => (
            <Chip key={e.id} onClick={() => onAsk(e.id, e.question)}>
              {e.question}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="grid">
          {topics.map((t) => (
            <button
              key={t.number}
              type="button"
              onClick={() => setNumber(t.number)}
              aria-label={`${t.name}, ${t.entries.length} questions`}
              className={row}
            >
              <span>{t.name}</span>
              <span aria-hidden="true" className="font-normal text-muted">
                {t.entries.length}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
