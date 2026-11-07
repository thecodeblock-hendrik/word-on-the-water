"use client";

import { useEffect } from "react";

import { parseVersion, versionCookie } from "@/lib/bible/remember";

/**
 * Remembers the Bible being read, so /bible opens in it next time. A preference cookie set in the
 * browser, so no request is made. Does nothing for a version that is not available.
 */
export function RememberVersion({ id }: { id: string }) {
  useEffect(() => {
    if (parseVersion(id) === id)
      document.cookie = versionCookie(id, location.protocol === "https:");
  }, [id]);
  return null;
}
