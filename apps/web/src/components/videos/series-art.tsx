import { ContentImage } from "@/components/content-image";
import { mediaUrl } from "@/components/devotional/media";
import { SERIES_ART } from "@/lib/devotionals/series";

const SCHEMES = ["when-light", "when-dark"];

type Props = {
  /** The devotional series whose art this is: a folder in content/series. */
  slug: string;
  sizes: string;
  /** Places the picture's frame; it must set a position. */
  frame: string;
  /** Places the picture in its frame. */
  className: string;
};

/**
 * The series art behind a heading: dawn in light, night swell in dark. It is decoration, because
 * the words over it say what it is, so it has no alt text. It is the largest thing on these pages,
 * so both pictures load at once and first: a lazy one waits for the layout, which took the largest
 * paint from 1.7s to 2.9s. The price is fetching the hidden one too, a few kilobytes.
 */
export function SeriesArt({ slug, sizes, frame, className }: Props) {
  return SERIES_ART.map((file, i) => (
    <span key={file} className={`${SCHEMES[i]} ${frame}`}>
      <ContentImage
        src={mediaUrl("series", slug, file)}
        alt=""
        loading="eager"
        fetchPriority="high"
        width={640}
        height={1024}
        sizes={sizes}
        className={className}
      />
    </span>
  ));
}
