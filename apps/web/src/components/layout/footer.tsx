import { ThemeToggle } from "@/components/theme-toggle";
import { setTheme } from "@/lib/actions/theme";

export function Footer() {
  return (
    <footer className="bg-deep pb-[env(safe-area-inset-bottom)] text-sm text-on-deep-muted">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-8">
        <p>Word on the Water</p>
        <ThemeToggle saveTheme={setTheme} />
      </div>
    </footer>
  );
}
