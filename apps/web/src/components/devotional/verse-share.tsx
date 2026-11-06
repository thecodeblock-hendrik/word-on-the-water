import { ContentImage } from "@/components/content-image";
import { mediaUrl } from "@/components/devotional/media";
import { buttonClasses } from "@/components/ui/button";
import type { Devotional } from "@/lib/devotionals/parse";

const cards = [
  { file: "verse-card-dawn-patrol.png", scheme: "when-light" },
  { file: "verse-card-night-swell.png", scheme: "when-dark" },
] as const;

/** The verse card for the current colour scheme, with a link to save it. */
export function VerseShare({ devotional }: { devotional: Devotional }) {
  const { keyVerse } = devotional.meta;
  const alt = `Verse card: ${keyVerse.text} ${keyVerse.ref}`;
  return (
    <section
      aria-labelledby="h-verse"
      className="grid gap-3.5 rounded-md border border-line bg-surface p-5"
    >
      <h2
        id="h-verse"
        className="font-display text-base font-semibold uppercase tracking-[.2em] text-accent-ink"
      >
        Share the verse
      </h2>
      <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        {cards.map(({ file, scheme }) => (
          <div key={file} className={scheme}>
            <ContentImage
              src={mediaUrl("devotionals", devotional.slug, file)}
              alt={alt}
              width={1080}
              height={1080}
              sizes="240px"
              className="block h-auto w-full rounded-sm"
            />
          </div>
        ))}
        <div className="font-ui text-[15px] text-muted">
          <p>
            Save this week&apos;s verse card for your phone&apos;s lock screen, or send it to a
            mate.
          </p>
          <div className="mt-3">
            {cards.map(({ file, scheme }) => (
              <div key={file} className={scheme}>
                <a
                  href={mediaUrl("devotionals", devotional.slug, file)}
                  download
                  className={buttonClasses("outline")}
                >
                  Save image
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
