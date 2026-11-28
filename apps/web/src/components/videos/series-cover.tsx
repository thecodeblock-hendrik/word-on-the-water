import { SeriesArt } from "./series-art";

/** The picture on a series' shelf block: the art, with the count and name along its dark foot. */
export function SeriesCover({ art, count, name }: { art: string; count: string; name: string }) {
  return (
    <div className="relative isolate flex aspect-[16/10] flex-col justify-end overflow-hidden bg-art p-4 text-white lg:aspect-[2/1]">
      <SeriesArt
        slug={art}
        sizes="(min-width: 672px) 640px, 100vw"
        frame="absolute inset-0 -z-10"
        className="size-full object-cover object-[center_69%] lg:object-[center_62%]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 top-[45%] -z-10 bg-[linear-gradient(transparent,rgb(10_12_20/.78)_75%)]"
      />
      <span className="font-ui text-sm font-semibold">{count}</span>
      <span className="font-display text-5xl font-bold uppercase">{name}</span>
    </div>
  );
}
