import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-display text-lg font-bold uppercase tracking-wide"
        >
          Word on the Water
        </Link>
        <Link
          href="/#subscribe"
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-bg"
        >
          Get the devotional
        </Link>
      </div>
    </header>
  );
}
