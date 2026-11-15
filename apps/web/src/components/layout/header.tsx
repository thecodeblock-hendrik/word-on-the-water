import Link from "next/link";

import { ChatLauncher } from "@/components/chat/chat-launcher";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { navLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { chat } from "@/content/chat";
import { setTheme } from "@/lib/actions/theme";
import { isBibleEnabled } from "@/lib/bible/flag";
import { isChatEnabled } from "@/lib/chat/flag";

export function Header() {
  const links = navLinks(isBibleEnabled());
  const chatEnabled = isChatEnabled();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1120px] items-center gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-3 min-[420px]:gap-3 min-[520px]:gap-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 whitespace-nowrap font-display text-[.875rem] font-bold uppercase tracking-[.06em] text-ink min-[420px]:text-[1.1rem] min-[420px]:tracking-[.12em]"
        >
          <Logo className="size-10 flex-none" />
          <span className="max-[374px]:sr-only">Word on the Water</span>
        </Link>
        <nav
          aria-label="Main"
          className="ml-auto hidden gap-4 whitespace-nowrap font-ui text-[15px] lg:flex xl:gap-[22px]"
        >
          {links.map((link) => (
            <NavLink
              key={link.label}
              href={link.href}
              match={link.match}
              prefetch={link.prefetch}
              className="inline-flex min-h-11 items-center font-medium text-ink hover:text-accent-ink"
            >
              {link.label}
            </NavLink>
          ))}
          {chatEnabled && (
            <ChatLauncher className="inline-flex min-h-11 items-center font-medium text-ink hover:text-accent-ink" />
          )}
        </nav>
        <Link
          href="/#subscribe"
          className={`${buttonClasses("primary")} ml-auto max-[419px]:px-4 lg:ml-0`}
        >
          <span className="hidden min-[520px]:max-lg:inline xl:inline">Get the devotional</span>
          <span className="min-[520px]:max-lg:hidden xl:hidden">Subscribe</span>
        </Link>
        <div className="hidden text-ink lg:block">
          <ThemeToggle saveTheme={setTheme} />
        </div>
        <MobileMenu
          links={links}
          chat={chatEnabled}
          themeToggle={<ThemeToggle saveTheme={setTheme} />}
        />
      </div>
      <noscript>
        <nav
          aria-label="Main"
          className="flex flex-wrap gap-x-5 border-t border-line pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] font-ui text-[15px] lg:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex min-h-11 items-center font-medium text-ink"
            >
              {link.label}
            </Link>
          ))}
          {chatEnabled && (
            <a
              href={`mailto:${chat.mail}`}
              className="inline-flex min-h-11 items-center font-medium text-ink"
            >
              {chat.title}
            </a>
          )}
        </nav>
      </noscript>
    </header>
  );
}
