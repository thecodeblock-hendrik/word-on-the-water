import { useId } from "react";

import type { BibleVersion } from "@/lib/bible/versions";

type Props = {
  versions: readonly BibleVersion[];
  value: string;
  onChange: (id: string) => void;
};

const tag =
  "ml-auto flex-none self-start rounded-full border border-line px-2 py-0.5 font-ui text-xs font-semibold text-muted";

/**
 * The Bibles as large radio cards: name, a plain line about it, and a tag. Native radios give
 * arrow-key movement and screen reader support; the selected card has a tag, not only a colour.
 * A Bible that is not available yet stays visible, disabled, with "Coming soon".
 */
export function VersionList({ versions, value, onChange }: Props) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label="Bible version" className="grid gap-3">
      {versions.map((version) => (
        <label
          key={version.id}
          className="flex min-h-16 cursor-pointer items-start gap-3 rounded-md border-2 border-line bg-surface p-3.5 has-[:checked]:border-accent has-[:checked]:bg-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:border-dashed has-[:disabled]:opacity-70 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={version.id}
            checked={value === version.id}
            disabled={!version.enabled}
            onChange={() => onChange(version.id)}
            // A click on the Bible that is already selected fires no change, but should still close a sheet.
            onClick={() => value === version.id && onChange(version.id)}
            className="mt-1 size-5 flex-none accent-accent-ink"
          />
          <span className="grid gap-0.5 font-ui">
            <span className="text-[17px] font-semibold text-ink">
              {version.name} ({version.short})
            </span>
            <span className="text-[14px] leading-snug text-muted">{version.description}</span>
          </span>
          {value === version.id && <span className={tag}>Selected</span>}
          {!version.enabled && <span className={tag}>Coming soon</span>}
        </label>
      ))}
    </div>
  );
}
