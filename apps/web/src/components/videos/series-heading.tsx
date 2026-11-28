import { SeriesArt } from "./series-art";

type Props = { art: string; eyebrow: string; title: string; introduction: string };

/**
 * The heading of a series' weekly path, with the art's whole width shown small and hung from the
 * top right, so that the lamp sits beside the title. Two shades keep the words readable over the
 * glow. Approved in docs/design/videos_advent_banner.html.
 */
export function SeriesHeading({ art, eyebrow, title, introduction }: Props) {
  return (
    <header className="relative isolate -mx-3 -mt-4 grid gap-1 overflow-hidden rounded-t-[19px] bg-art px-4 pb-3 pt-3.5 text-white [text-shadow:0_1px_3px_rgb(0_0_0/.75)]">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 -right-[222px] -z-10 w-[520px] [mask-image:linear-gradient(90deg,transparent,#000_38%)] max-[374px]:-right-[246px]"
      >
        <SeriesArt
          slug={art}
          sizes="520px"
          frame="absolute inset-0"
          className="absolute left-0 top-[-391px] w-[520px] max-w-none"
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(transparent_22%,rgb(10_12_20/.72)_52%),linear-gradient(90deg,rgb(10_12_20/.6)_0_68%,transparent_84%)]"
      />
      <p className="font-ui text-xs font-semibold uppercase tracking-[.14em] text-accent-on-art">
        {eyebrow}
      </p>
      <h1 tabIndex={-1} className="font-display text-3xl font-bold uppercase leading-[1.1]">
        {title}
      </h1>
      <p className="font-ui text-sm text-white/90">{introduction}</p>
    </header>
  );
}
