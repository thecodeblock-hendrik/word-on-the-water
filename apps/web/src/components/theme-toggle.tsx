"use client";

import type { Theme } from "@/lib/theme";

function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark switch. Updates the page at once and saves the choice in a cookie. */
export function ThemeToggle({ saveTheme }: { saveTheme: (theme: Theme) => Promise<void> }) {
  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    void saveTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-current"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor" />
      </svg>
    </button>
  );
}
