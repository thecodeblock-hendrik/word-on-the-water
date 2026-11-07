import "@testing-library/jest-dom/vitest";

// jsdom has no layout, so it does not implement scrollIntoView.
if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}
