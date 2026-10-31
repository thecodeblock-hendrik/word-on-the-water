import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

/** Vercel skips the build on exit 0, builds on exit 1, and fails the deployment on anything else. */
const root = join(__dirname, "../../../..");
const SKIP = 0;
const BUILD = 1;

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function runIgnoreCommand(app: "web" | "api", env: Record<string, string>, repo: string) {
  const config = JSON.parse(readFileSync(join(root, `apps/${app}/vercel.json`), "utf8"));
  return spawnSync("sh", ["-c", config.ignoreCommand], {
    cwd: join(repo, "apps", app),
    env: { ...process.env, ...env },
  }).status;
}

describe.each(["web", "api"] as const)("%s ignoreCommand", (app) => {
  let repo: string;
  let first: string;
  let second: string;

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "vercel-ignore-"));
    for (const dir of ["apps/web", "apps/api", "packages"])
      mkdirSync(join(repo, dir), { recursive: true });
    for (const file of [
      "apps/web/a.txt",
      "apps/api/a.txt",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
    ]) {
      writeFileSync(join(repo, file), "one");
    }
    git(repo, "init", "-q");
    git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "add", ".");
    git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "one");
    first = git(repo, "rev-parse", "HEAD");
    writeFileSync(join(repo, "docs.txt"), "docs only");
    git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "add", ".");
    git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "two");
    second = git(repo, "rev-parse", "HEAD");
  });

  const env = (previous: string) => ({
    VERCEL_ENV: "production",
    VERCEL_GIT_PREVIOUS_SHA: previous,
    VERCEL_GIT_COMMIT_SHA: second,
  });

  it("skips when nothing under the app changed", () => {
    expect(runIgnoreCommand(app, env(first), repo)).toBe(SKIP);
  });

  it("builds when the app changed", () => {
    writeFileSync(join(repo, `apps/${app}/a.txt`), "changed");
    git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "app change");
    expect(runIgnoreCommand(app, env(first), repo)).toBe(BUILD);
  });

  it("builds when the previous deploy's commit is not in the clone", () => {
    const missing = "1".repeat(40);
    expect(runIgnoreCommand(app, env(missing), repo)).toBe(BUILD);
  });
});
