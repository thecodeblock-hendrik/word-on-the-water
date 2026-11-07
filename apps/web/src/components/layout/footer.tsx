import Link from "next/link";

import { Logo } from "@/components/logo";
import { footer, hero } from "@/content/landing";
import { ESV_LIMITS, ESV_NOTICE, ESV_URL, formatReference } from "@/lib/scripture";

const linkClass = "inline-flex min-h-11 items-center text-on-deep-muted hover:text-on-deep";

type Props = { year?: number; privacyHref?: string };

export function Footer({ year = new Date().getFullYear(), privacyHref }: Props) {
  const follow = [
    ...footer.social.flatMap((s) => (s.href ? [{ label: s.label, href: s.href }] : [])),
    footer.email,
  ];
  const groups = [...footer.groups, { title: "Follow", links: follow }];

  return (
    <footer className="bg-deep pb-[env(safe-area-inset-bottom)] font-ui text-sm text-on-deep-muted [--logo-gap:var(--deep)] [--logo-ring:var(--on-deep)] [--logo-wave:var(--accent-on-deep)]">
      <div className="mx-auto grid max-w-[1120px] gap-9 pb-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-14">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 grid content-start gap-3 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2.5 font-display text-[1.1rem] font-bold uppercase tracking-[.12em] text-on-deep"
            >
              <Logo className="size-10 flex-none" />
              <span>Word on the Water</span>
            </Link>
            <p className="max-w-[34ch] font-serif italic text-on-deep">
              “{hero.verse.text}” {formatReference(hero.verse.reference)} (ESV)
            </p>
          </div>
          {groups.map((group) => (
            <nav key={group.title} aria-labelledby={`footer-${group.title}`}>
              <h3
                id={`footer-${group.title}`}
                className="mb-1 font-display text-[.95rem] font-semibold uppercase tracking-[.14em] text-on-deep"
              >
                {group.title}
              </h3>
              <ul role="list" className="m-0 grid list-none p-0">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="grid gap-2 border-t border-on-deep/20 pt-5 text-[12.5px] leading-[1.55]">
          <p>
            {ESV_NOTICE} {ESV_LIMITS}
          </p>
          <a
            href={ESV_URL}
            className="inline-flex min-h-11 items-center justify-self-start underline hover:text-on-deep"
          >
            www.esv.org
          </a>
          <div className="flex items-center justify-between gap-4">
            <p>
              © {year} Word on the Water
              {privacyHref ? (
                <>
                  {" · "}
                  <Link href={privacyHref} className="underline hover:text-on-deep">
                    Privacy policy
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
