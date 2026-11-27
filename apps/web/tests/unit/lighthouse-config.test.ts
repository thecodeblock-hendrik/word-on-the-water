import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const { ci } = JSON.parse(
  readFileSync(new URL("../../lighthouserc.json", import.meta.url), "utf8"),
);

describe("the Lighthouse run", () => {
  it.each(["BIBLE_ENABLED=1", "CHAT_ENABLED=1"])(
    "starts the site with %s, so the phone bottom bar is measured",
    (setting) => {
      expect(ci.collect.startServerCommand.split(" ")).toContain(setting);
    },
  );
});
