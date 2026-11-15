import { threadSchema, type Thread } from "@/lib/chat/thread";

const KEY = "wotw-chat";

/** The thread lives only in this tab (sessionStorage). Storage can be blocked, so every call is guarded. */
export function loadThread(): Thread {
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    const parsed = threadSchema.safeParse(stored);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveThread(thread: Thread): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(thread));
  } catch {
    // Private mode or a full store: the chat still works, it just is not remembered.
  }
}

export function clearThread(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
