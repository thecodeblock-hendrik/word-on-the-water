import Link from "next/link";

import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { buttonClasses } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-[max(1rem,env(safe-area-inset-left))] py-3 min-[520px]:gap-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 whitespace-nowrap font-display text-[.95rem] font-bold uppercase tracking-[.12em] text-ink min-[420px]:text-[1.1rem]"
        >
          <Logo className="size-10 flex-none" />
          <span className="max-[359px]:sr-only">Word on the Water</span>
        </Link>
        <nav aria-label="Main" className="ml-auto hidden gap-[22px] font-ui text-[15px] lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center font-medium text-ink hover:text-accent-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/#subscribe" className={`${buttonClasses("primary")} ml-auto lg:ml-0`}>
          <span className="hidden min-[520px]:inline">Get the devotional</span>
          <span className="min-[520px]:hidden">Subscribe</span>
        </Link>
        <MobileMenu />
      </div>
    </header>
  );
}
