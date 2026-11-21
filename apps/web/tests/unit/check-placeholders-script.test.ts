import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("the check:placeholders launch gate", () => {
  it("runs under plain Node and reports on the content, instead of failing to load it", () => {
    const run = spawnSync("node", ["scripts/check-placeholders.mts"], {
      encoding: "utf8",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
    expect(run.stderr + run.stdout).not.toMatch(/ERR_MODULE_NOT_FOUND/);
    expect(run.stderr + run.stdout).toMatch(/placeholder/i);
  });
});
