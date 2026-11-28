// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PrivacyPage, { metadata } from "@/app/privacy/page";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the privacy page", () => {
  beforeEach(() => vi.stubEnv("VIDEOS_ENABLED", ""));

  it("has one h1, the date it was updated and a heading for each section", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByText("Last updated 18 November 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(9);
  });

  it("links the email address so a person can write to us", () => {
    render(<PrivacyPage />);
    const links = screen.getAllByRole("link", { name: "hello@wordonthewater.net" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links)
      expect(link).toHaveAttribute("href", "mailto:hello@wordonthewater.net");
  });

  it("shows who runs the ministry and the postal address, with nothing left to fill in", () => {
    const { container } = render(<PrivacyPage />);
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(0);
    expect(
      screen.getByText(/run by Word On The Water, the registered name of the ministry/),
    ).toBeInTheDocument();
    expect(screen.getByText(/PO Box 6055, Port Elizabeth, Eastern Cape 6001/)).toBeInTheDocument();
  });

  it("lists the Bible cookies only when the Bible reader is on", () => {
    const { unmount } = render(<PrivacyPage />);
    expect(screen.queryByText("bible-version and bible-passage")).not.toBeInTheDocument();
    unmount();
    vi.stubEnv("BIBLE_ENABLED", "1");
    render(<PrivacyPage />);
    const cookies = screen.getByRole("heading", { level: 2, name: /cookies/i }).closest("section")!;
    expect(within(cookies).getByText("bible-version and bible-passage")).toBeInTheDocument();
  });

  it("describes the videos, with working links and a new date, only while they are on", () => {
    vi.stubEnv("VIDEOS_ENABLED", "1");
    render(<PrivacyPage />);
    expect(screen.getByText("Watching videos")).toBeInTheDocument();
    expect(screen.getByText("Last updated 28 November 2026")).toBeInTheDocument();
    for (const url of [
      "https://www.youtube.com/t/terms",
      "https://www.google.com/policies/privacy",
    ]) {
      expect(screen.getByRole("link", { name: url })).toHaveAttribute("href", url);
    }
  });

  it("has a title, a description and its own canonical address, and may be indexed", () => {
    expect(metadata.title).toBe("Privacy policy");
    expect(metadata.description).toMatch(/what we collect/i);
    expect(metadata.alternates?.canonical).toBe("/privacy");
    expect(metadata.robots).toBeUndefined();
  });
});
