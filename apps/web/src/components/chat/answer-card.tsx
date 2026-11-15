import { Chip } from "@/components/chat/chip";
import { chat } from "@/content/chat";
import type { EntryView } from "@/lib/chat/thread";
import { verseHref } from "@/lib/chat/verses";

type Props = {
  entry: EntryView;
  /** True when the explanation was asked for and is shown. */
  expanded: boolean;
  /** Only the newest answer offers Read more. */
  canExpand: boolean;
  /** Link each key verse to the Bible reader. */
  bibleLinks: boolean;
  onAsk: (entryId: string, question: string) => void;
  onMore: () => void;
  onTerm: (term: string) => void;
};

const label = "font-ui text-xs font-semibold uppercase tracking-[.12em] text-muted";

/** One answer: the short answer first, depth on request, then verses and follow-up chips. */
export function AnswerCard({
  entry,
  expanded,
  canExpand,
  bibleLinks,
  onAsk,
  onMore,
  onTerm,
}: Props) {
  return (
    <div className="grid gap-3">
      {entry.contested && (
        <span className="w-fit rounded-full border-[1.5px] border-accent px-3 py-1 font-ui text-xs font-bold uppercase tracking-[.08em] text-accent-ink">
          Christians differ on this
        </span>
      )}
      <p>{entry.short_answer}</p>
      {expanded && <p>{entry.explanation}</p>}
      {canExpand && !expanded && (
        <Chip onClick={onMore} className="w-fit">
          {chat.readMore}
        </Chip>
      )}
      {entry.contested_note && (
        <p className="rounded-md border border-line bg-bg p-3 font-ui text-[15px] text-muted">
          {entry.contested_note}
        </p>
      )}
      {entry.key_verses.length > 0 && (
        <div className="grid gap-1.5">
          <span className={label}>{chat.verses}</span>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {entry.key_verses.map((verse) => {
              const href = bibleLinks ? verseHref(verse) : null;
              return (
                <li key={verse} className="font-ui text-[15px] font-medium text-accent-ink">
                  {href ? (
                    <a href={href} className="inline-flex min-h-11 items-center underline">
                      {verse}
                    </a>
                  ) : (
                    verse
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {entry.glossary_terms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.glossary_terms.map((t) => (
            <Chip key={t.term} onClick={() => onTerm(t.term)}>
              {t.term}
            </Chip>
          ))}
        </div>
      )}
      {entry.related.length > 0 && (
        <div className="grid gap-1.5">
          <span className={label}>{chat.related}</span>
          <div className="flex flex-wrap gap-2">
            {entry.related.map((r) => (
              <Chip key={r.id} onClick={() => onAsk(r.id, r.question)}>
                {r.question}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
