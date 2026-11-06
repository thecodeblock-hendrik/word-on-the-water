import Link from "next/link";

import type { SeriesLink } from "@/lib/devotionals/series-view";

const card =
  "grid gap-1 rounded-md border border-line bg-surface px-[18px] py-4 font-ui text-ink no-underline";

function NavCard({ link, align }: { link: SeriesLink; align?: "right" }) {
  const body = (
    <>
      <small className="text-xs uppercase tracking-[.12em] text-muted">{link.label}</small>
      <b className="font-display text-[1.2rem] font-semibold uppercase tracking-[.04em]">
        {link.title}
      </b>
    </>
  );
  const className = `${card} ${align === "right" ? "sm:text-right" : ""}`;
  return link.href ? (
    <Link href={link.href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={`${className} opacity-55`}>{body}</div>
  );
}

/** Previous and next in the series. A week that is not published yet is shown, but is not a link. */
export function SeriesNav({ previous, next }: { previous: SeriesLink; next?: SeriesLink }) {
  return (
    <nav aria-label="Series" className="grid gap-3.5 sm:grid-cols-2">
      <NavCard link={previous} />
      {next && <NavCard link={next} align="right" />}
    </nav>
  );
}
