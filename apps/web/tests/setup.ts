import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia; a phone-sized screen (no match for any min-width query) is the default.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({ matches: false, media: query })) as never;
}
