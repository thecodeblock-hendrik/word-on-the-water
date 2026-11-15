import { AnswerCard } from "@/components/chat/answer-card";
import { Chip } from "@/components/chat/chip";
import { CrisisText } from "@/components/chat/crisis-text";
import { chat } from "@/content/chat";
import type { ChatReply, Option, Thread } from "@/lib/chat/thread";

type Actions = {
  onAsk: (entryId: string, question: string) => void;
  onMore: () => void;
  onTerm: (term: string) => void;
  onBrowse: () => void;
};

function Options({ options, onAsk }: { options: Option[]; onAsk: Actions["onAsk"] }) {
  return (
    <div className="flex flex-col items-stretch gap-2">
      {options.map((o) => (
        <Chip key={o.id} onClick={() => onAsk(o.id, o.question)}>
          {o.question}
        </Chip>
      ))}
    </div>
  );
}

function Reply({
  reply,
  isLastAnswer,
  actions,
  bibleLinks,
}: {
  reply: ChatReply;
  isLastAnswer: boolean;
  actions: Actions;
  bibleLinks: boolean;
}) {
  if (reply.kind === "answer" && reply.entry) {
    return (
      <AnswerCard
        entry={reply.entry}
        expanded={reply.expand}
        canExpand={isLastAnswer}
        bibleLinks={bibleLinks}
        onAsk={actions.onAsk}
        onMore={actions.onMore}
        onTerm={actions.onTerm}
      />
    );
  }
  if (reply.kind === "crisis") return <CrisisText text={reply.text ?? ""} />;
  if (reply.kind === "term" && reply.term) {
    return (
      <div className="grid gap-3">
        <p className="font-semibold">{reply.term.term}</p>
        <p>{reply.term.meaning}</p>
        <Options options={reply.term.entries} onAsk={actions.onAsk} />
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {reply.text && <p>{reply.text}</p>}
      {reply.options.length > 0 && <Options options={reply.options} onAsk={actions.onAsk} />}
      {reply.kind === "no_answer" && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`mailto:${chat.mail}`}
            className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-line bg-surface px-4 font-ui text-[15px] font-medium text-ink"
          >
            {chat.emailUs}
          </a>
          <Chip onClick={actions.onBrowse}>{chat.browseShort}</Chip>
        </div>
      )}
    </div>
  );
}

/** The conversation. New replies are announced politely; the input keeps focus. */
export function MessageList({
  thread,
  pending,
  actions,
  bibleLinks,
}: {
  thread: Thread;
  pending: boolean;
  actions: Actions;
  bibleLinks: boolean;
}) {
  const lastAnswer = thread.findLastIndex(
    (item) => item.role === "bot" && item.reply.kind === "answer",
  );
  return (
    <div role="log" aria-live="polite" className="grid gap-4">
      {thread.map((item, i) =>
        item.role === "me" ? (
          <div
            key={i}
            className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent-ink px-4 py-2 font-ui text-bg"
          >
            {item.text}
          </div>
        ) : (
          <div
            key={i}
            className="max-w-[95%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3"
          >
            <Reply
              reply={item.reply}
              isLastAnswer={i === lastAnswer}
              actions={actions}
              bibleLinks={bibleLinks}
            />
          </div>
        ),
      )}
      {pending && <p className="font-ui text-sm text-muted">Looking that up…</p>}
    </div>
  );
}
