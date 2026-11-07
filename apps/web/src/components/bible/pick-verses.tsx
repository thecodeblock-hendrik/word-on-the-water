import { type Book } from "@/lib/bible/books";
import { lastVerseOf } from "@/lib/bible/counts";
import { chooseVerses, type PickerState } from "@/lib/bible/picker";

const stepButton =
  "inline-flex size-11 items-center justify-center rounded-sm border-[1.5px] border-line bg-surface font-ui text-xl font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40";

function Stepper({
  label,
  value,
  canDecrease,
  canIncrease,
  onChange,
}: {
  label: string;
  value: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (delta: number) => void;
}) {
  const lower = label.toLowerCase();
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3 font-ui">
      <span className="w-24 text-[15px] text-muted">{label}</span>
      <button
        type="button"
        aria-label={`Decrease ${lower}`}
        disabled={!canDecrease}
        onClick={() => onChange(-1)}
        className={stepButton}
      >
        −
      </button>
      <output className="min-w-10 text-center text-[1.2rem] font-semibold text-ink">{value}</output>
      <button
        type="button"
        aria-label={`Increase ${lower}`}
        disabled={!canIncrease}
        onClick={() => onChange(1)}
        className={stepButton}
      >
        +
      </button>
    </div>
  );
}

const choice =
  "flex min-h-14 cursor-pointer items-center gap-3 rounded-md border-2 border-line bg-surface px-3.5 font-ui text-[17px] font-semibold text-ink has-[:checked]:border-accent has-[:checked]:bg-bg";

/** Whole chapter, or some verses chosen with two steppers (no typing). */
export function PickVerses({
  book,
  state,
  onChange,
}: {
  book: Book;
  state: PickerState;
  onChange: (next: PickerState) => void;
}) {
  const last = lastVerseOf(state.version, book, state.chapter);
  const some = state.from !== null && state.to !== null;

  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="Verses" className="grid gap-3">
        <label className={choice}>
          <input
            type="radio"
            name="verses"
            checked={!some}
            onChange={() => onChange(chooseVerses(state, null, null))}
            className="size-5 accent-accent-ink"
          />
          Whole chapter ({last} verses)
        </label>
        <label className={choice}>
          <input
            type="radio"
            name="verses"
            checked={some}
            onChange={() => onChange(chooseVerses(state, 1, 1))}
            className="size-5 accent-accent-ink"
          />
          Some verses
        </label>
      </div>
      {some && (
        <div className="grid gap-3 rounded-md border border-line bg-surface p-4">
          <Stepper
            label="First verse"
            value={state.from!}
            canDecrease={state.from! > 1}
            canIncrease={state.from! < last}
            onChange={(delta) => onChange(chooseVerses(state, state.from! + delta, state.to!))}
          />
          <Stepper
            label="Last verse"
            value={state.to!}
            canDecrease={state.to! > state.from!}
            canIncrease={state.to! < last}
            onChange={(delta) => onChange(chooseVerses(state, state.from!, state.to! + delta))}
          />
        </div>
      )}
    </div>
  );
}
