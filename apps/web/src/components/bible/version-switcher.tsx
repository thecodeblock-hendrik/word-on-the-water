"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { VersionList } from "@/components/bible/version-list";
import { chooseVersion, type PickerState, readHref } from "@/lib/bible/picker";
import { findVersion, VERSIONS } from "@/lib/bible/versions";

/**
 * A chip with the current Bible that opens a bottom sheet to switch. Choosing a Bible opens the
 * same passage in it. On a wide screen the sheet is a centred card.
 */
export function VersionSwitcher({ state }: { state: PickerState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = findVersion(state.version);

  function choose(id: string) {
    setOpen(false);
    if (id !== state.version) router.push(readHref(chooseVersion(state, id)));
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={`Bible version: ${current?.short}. Change`}
        className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-sm border-[1.5px] border-line bg-surface px-3 font-ui text-[15px] font-semibold text-ink"
      >
        {current?.short}
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-deep/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 grid gap-4 rounded-t-2xl border-t border-line bg-bg px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-menu md:inset-auto md:left-1/2 md:top-1/2 md:w-[28rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:p-5"
        >
          <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line md:hidden" />
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="font-display text-[1.2rem] font-semibold uppercase tracking-[.08em] text-ink">
              Choose Bible
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-11 items-center justify-center rounded-sm border-[1.5px] border-line text-ink"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
                <path
                  d="M4 4l12 12M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Dialog.Close>
          </div>
          <VersionList versions={VERSIONS} value={state.version} onChange={choose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
