import { scrollToCurrent } from "@/components/bible/scroll-to-current";
import { BOOKS, type Testament } from "@/lib/bible/books";

const GROUPS: { testament: Testament; title: string }[] = [
  { testament: "old", title: "Old Testament" },
  { testament: "new", title: "New Testament" },
];

/** All 66 books in two groups. The current book is marked with aria-current. */
export function PickBook({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  return (
    <>
      {GROUPS.map(({ testament, title }) => (
        <section key={testament} className="grid gap-1">
          <h3 className="pb-1 pt-4 font-ui text-xs font-semibold uppercase tracking-[.1em] text-muted first:pt-0">
            {title}
          </h3>
          <div data-books className="grid">
            {BOOKS.filter((book) => book.testament === testament).map((book) => (
              <button
                key={book.slug}
                type="button"
                ref={book.slug === value ? scrollToCurrent : undefined}
                aria-current={book.slug === value ? "true" : undefined}
                onClick={() => onChange(book.slug)}
                className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-1 text-left font-ui text-[17px] font-semibold text-ink aria-[current=true]:border-l-4 aria-[current=true]:border-l-accent aria-[current=true]:bg-surface aria-[current=true]:pl-3"
              >
                {book.name}
                <span aria-hidden="true" className="font-normal text-muted">
                  {book.chapters}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
