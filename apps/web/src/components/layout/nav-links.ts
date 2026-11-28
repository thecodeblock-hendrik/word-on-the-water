export type NavItem = {
  label: string;
  href: string;
  /** A path prefix: the link is marked as the current page on this path and below it. */
  match?: string;
  /** Set false for a link that redirects, so the browser does not prefetch the redirect. */
  prefetch?: boolean;
};

export const NAV_LINKS: readonly NavItem[] = [
  { label: "About", href: "/" },
  { label: "Devotionals", href: "/#coming" },
  { label: "Start here", href: "/#start" },
  { label: "What we believe", href: "/#believe" },
];

const BIBLE_LINK: NavItem = { label: "Bible", href: "/bible", match: "/bible", prefetch: false };

const VIDEOS_LINK: NavItem = { label: "Videos", href: "/videos", match: "/videos" };

/** The section links, with Bible and then Videos after Devotionals, each while it is on. */
export function navLinks(bibleEnabled: boolean, videosEnabled = false): readonly NavItem[] {
  const extra = [...(bibleEnabled ? [BIBLE_LINK] : []), ...(videosEnabled ? [VIDEOS_LINK] : [])];
  const at = NAV_LINKS.findIndex((link) => link.label === "Devotionals") + 1;
  return [...NAV_LINKS.slice(0, at), ...extra, ...NAV_LINKS.slice(at)];
}
