const PHONE = /(\b0\d{3} \d{3} \d{3}\b)/;

/** The fixed crisis text with each phone number as a large tap-to-call link. */
export function CrisisText({ text }: { text: string }) {
  return (
    <p className="rounded-md border-[1.5px] border-accent bg-surface p-4 font-ui text-[16px] leading-relaxed text-ink">
      {text.split(PHONE).map((part, i) =>
        PHONE.test(part) ? (
          <a
            key={i}
            href={`tel:${part.replaceAll(" ", "")}`}
            className="inline-flex min-h-11 items-center font-bold text-accent-ink underline"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
