import { test as base } from "@playwright/test";

/**
 * `test` for specs that open their own browser contexts: whatever a test leaves open is closed
 * after it, pass or fail. Left open, they pile up in the worker's browser, and in WebKit each
 * later test got slower until some timed out.
 */
export const test = base.extend<{ closeOpened: void }>({
  closeOpened: [
    async ({ browser }, use) => {
      await use();
      // Set up first, so torn down last: the test's own page and context are already gone.
      await Promise.all(browser.contexts().map((context) => context.close()));
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
