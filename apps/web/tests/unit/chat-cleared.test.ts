import { beforeEach, describe, expect, it } from "vitest";

import { dropCleared, stashCleared, takeCleared } from "@/lib/chat/cleared";
import type { Thread } from "@/lib/chat/thread";

const thread: Thread = [{ role: "me", text: "Does God love me?" }];

beforeEach(dropCleared);

describe("the cleared chat kept for Undo", () => {
  it("hands back the thread and the draft once, then nothing", () => {
    stashCleared({ thread, draft: "Why did Jesus die?" });
    expect(takeCleared()).toEqual({ thread, draft: "Why did Jesus die?" });
    expect(takeCleared()).toBeNull();
  });

  it("is forgotten when dropped", () => {
    stashCleared({ thread, draft: "" });
    dropCleared();
    expect(takeCleared()).toBeNull();
  });

  it("keeps only the latest chat cleared", () => {
    stashCleared({ thread, draft: "first" });
    stashCleared({ thread: [], draft: "second" });
    expect(takeCleared()).toEqual({ thread: [], draft: "second" });
  });
});
