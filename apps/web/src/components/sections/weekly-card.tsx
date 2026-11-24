import { ContentImage } from "@/components/content-image";
import { mediaUrl } from "@/components/devotional/media";
import { PlaceholderText } from "@/components/placeholder-text";
import type { Devotional } from "@/lib/devotionals/parse";
import type { Series } from "@/lib/devotionals/series";

type Offer = { status: string; title: string; body: string };

const art = "absolute inset-0 size-full object-cover";
const sizes = "(min-width: 768px) 340px, 100vw";

/** One bar per week of the series: weeks read so far and this week filled in. Decorative; the text says the week. */
function Progress({ week, weeks }: { week: number; weeks: number }) {
  return (
    <div aria-hidden="true" className="flex gap-1.5">
      {Array.from({ length: weeks }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-[26px] rounded-[3px] ${i < week ? "bg-accent" : "bg-line"} ${i + 1 === week ? "shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)]" : ""}`}
        />
      ))}
    </div>
  );
}

/** The weekly devotional card, with the current series art, name and description. */
export function WeeklyCard({
  offer,
  devotional,
  series,
}: {
  offer: Offer;
  devotional: Devotional;
  series: Series;
}) {
  const { seriesNumber, title } = devotional.meta;
  const src = (file: string) => mediaUrl("series", series.slug, file);
  return (
    <article className="grid content-start overflow-hidden rounded-md border border-line bg-surface md:grid-cols-[340px_minmax(0,1fr)]">
      <div className="relative aspect-[2/1] bg-deep md:aspect-auto md:min-h-[280px]">
        <div className="when-light absolute inset-0">
          <ContentImage
            src={src("art-dawn-patrol.png")}
            alt={series.artAlt}
            width={680}
            height={340}
            sizes={sizes}
            className={art}
          />
        </div>
        <div className="when-dark absolute inset-0">
          <ContentImage
            src={src("art-night-swell.png")}
            alt={series.artAlt}
            width={680}
            height={340}
            sizes={sizes}
            className={art}
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(transparent_35%,rgb(10_24_37/.85))]" />
        <div className="absolute inset-x-0 bottom-0 grid gap-0.5 p-5">
          <span className="font-ui text-[11px] font-bold uppercase tracking-[.16em] text-accent-on-deep">
            This season&apos;s series
          </span>
          <span className="font-display text-[2.5rem] font-semibold uppercase leading-none tracking-[.06em] text-on-deep">
            {series.title}
          </span>
          <span className="font-serif text-sm italic text-on-deep-muted">{series.tagline}</span>
        </div>
      </div>
      <div className="grid content-start gap-3 p-6 md:p-7">
        <span className="flex items-center gap-2 font-ui text-xs font-semibold uppercase tracking-[.08em] text-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          <span>
            <PlaceholderText>{offer.status}</PlaceholderText>
          </span>
        </span>
        <h3 className="font-display text-[1.35rem] font-semibold uppercase leading-[1.05] tracking-[.05em]">
          {offer.title}
        </h3>
        <p className="text-[.98rem] text-muted">
          <PlaceholderText>{offer.body}</PlaceholderText>
        </p>
        <div className="grid gap-3 border-t border-line pt-3">
          <p className="text-[.98rem]">{series.description}</p>
          <Progress week={seriesNumber} weeks={series.outline.length} />
          <p className="font-ui text-xs font-semibold uppercase tracking-[.08em] text-accent-ink">
            Week {seriesNumber} of {series.outline.length}: {title}
          </p>
        </div>
      </div>
    </article>
  );
}
