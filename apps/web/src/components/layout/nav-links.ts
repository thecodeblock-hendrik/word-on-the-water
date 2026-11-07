export type NavItem = {
  label: string;
  href: string;
  /** A path prefix: the link is marked as the current page on this path and below it. */
  match?: string;
};

export const NAV_LINKS: readonly NavItem[] = [
  { label: "About", href: "/#about" },
  { label: "Devotionals", href: "/#coming" },
  { label: "Start here", href: "/#start" },
  { label: "What we believe", href: "/#believe" },
  { label: "Prayer", href: "/#contact" },
];

const BIBLE_LINK: NavItem = { label: "Bible", href: "/bible", match: "/bible" };

/** The section links, with Bible after Devotionals while the Bible reader is on. */
export function navLinks(bibleEnabled: boolean): readonly NavItem[] {
  if (!bibleEnabled) return NAV_LINKS;
  const at = NAV_LINKS.findIndex((link) => link.label === "Devotionals") + 1;
  return [...NAV_LINKS.slice(0, at), BIBLE_LINK, ...NAV_LINKS.slice(at)];
}
