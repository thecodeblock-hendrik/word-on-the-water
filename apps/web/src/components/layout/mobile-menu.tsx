"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useSyncExternalStore, type ReactNode } from "react";

import { NAV_LINKS } from "@/components/layout/nav-links";

const subscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Menu for screens below lg. Non-modal, so the button stays usable and toggles it.
 * Esc, the button or choosing a link closes it, and focus returns to the button.
 * The theme toggle sits at the foot of the panel, because the header bar has no room for it here.
 */
export function MobileMenu({ themeToggle }: { themeToggle: ReactNode }) {
  const hydrated = useHydrated();
  return (
    <Dialog.Root modal={false}>
      <Dialog.Trigger
        aria-label="Menu"
        className={`inline-flex size-11 flex-none items-center justify-center rounded-sm border-[1.5px] border-line text-ink lg:hidden ${hydrated ? "" : "invisible"}`}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
          <path
            d="M2 5h16M2 10h16M2 15h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </Dialog.Trigger>
      <Dialog.Content
        data-testid="mobile-menu"
        aria-describedby={undefined}
        className="absolute inset-x-0 top-full animate-menu-in border-b border-line bg-bg px-4 pb-4 pt-2 shadow-menu lg:hidden"
      >
        <Dialog.Title className="sr-only">Menu</Dialog.Title>
        <nav aria-label="Main menu" className="grid">
          {NAV_LINKS.map((link) => (
            <Dialog.Close key={link.href} asChild>
              <Link
                href={link.href}
                className="border-b border-line py-3.5 font-ui text-[17px] font-medium text-ink"
              >
                {link.label}
              </Link>
            </Dialog.Close>
          ))}
        </nav>
        <div className="flex items-center justify-between pt-3 font-ui text-[17px] font-medium text-ink">
          <span>Theme</span>
          {themeToggle}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
