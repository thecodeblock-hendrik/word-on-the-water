import { scrollToCurrent } from "@/components/bible/scroll-to-current";
import { type Book } from "@/lib/bible/books";
import { chapterNumbers } from "@/lib/bible/picker";

/** The chapters of a book as a grid of buttons at least 44px square. The current one is marked. */
export function PickChapter({
  book,
  value,
  onChange,
}: {
  book: Book;
  value: number;
  onChange: (chapter: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {chapterNumbers(book).map((chapter) => (
        <button
          key={chapter}
          type="button"
          ref={chapter === value ? scrollToCurrent : undefined}
          aria-current={chapter === value ? "true" : undefined}
          onClick={() => onChange(chapter)}
          className="min-h-11 w-full rounded-sm border-[1.5px] border-line bg-surface font-ui text-[17px] font-semibold text-ink aria-[current=true]:border-accent-ink aria-[current=true]:bg-accent-ink aria-[current=true]:text-bg"
        >
          {chapter}
        </button>
      ))}
    </div>
  );
}
