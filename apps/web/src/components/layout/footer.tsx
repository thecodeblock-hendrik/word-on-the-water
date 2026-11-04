import { ThemeToggle } from "@/components/theme-toggle";
import { setTheme } from "@/lib/actions/theme";

export function Footer() {
  return (
    <footer className="bg-deep pb-[env(safe-area-inset-bottom)] text-sm text-on-deep-muted">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-8">
        <p>Word on the Water</p>
        <ThemeToggle saveTheme={setTheme} />
      </div>
    </footer>
  );
}
