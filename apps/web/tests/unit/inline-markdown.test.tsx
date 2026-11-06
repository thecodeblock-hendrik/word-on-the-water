// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InlineMarkdown } from "@/components/inline-markdown";

afterEach(cleanup);

describe("InlineMarkdown", () => {
  it("renders plain text unchanged", () => {
    const { container } = render(<InlineMarkdown>Just words.</InlineMarkdown>);
    expect(container).toHaveTextContent("Just words.");
    expect(container.querySelector("em, strong")).toBeNull();
  });

  it("renders *italic* and **bold** and removes the markers", () => {
    const { container } = render(
      <InlineMarkdown>
        The psalmist says *more than watchmen* and **Read further:** now.
      </InlineMarkdown>,
    );
    expect(container.querySelector("em")).toHaveTextContent("more than watchmen");
    expect(container.querySelector("strong")).toHaveTextContent("Read further:");
    expect(container).toHaveTextContent(
      "The psalmist says more than watchmen and Read further: now.",
    );
  });

  it("never turns text into HTML", () => {
    const { container } = render(
      <InlineMarkdown>{"<script>alert(1)</script> *ok*"}</InlineMarkdown>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container).toHaveTextContent("<script>alert(1)</script> ok");
  });

  it("renders ^5^ as a verse number", () => {
    const { container } = render(
      <InlineMarkdown>{"^5^I wait for him; ^6^my soul waits"}</InlineMarkdown>,
    );
    expect([...container.querySelectorAll("sup")].map((e) => e.textContent)).toEqual(["5", "6"]);
    expect(container).toHaveTextContent("5I wait for him; 6my soul waits");
  });

  it("shows LORD in small capitals and leaves Lord alone", () => {
    const { container } = render(
      <InlineMarkdown>{"I wait for the LORD and the Lord."}</InlineMarkdown>,
    );
    const caps = container.querySelectorAll("[data-small-caps]");
    expect(caps).toHaveLength(1);
    expect(caps[0]).toHaveTextContent("Lord");
    expect(container).toHaveTextContent("I wait for the Lord and the Lord.");
  });
});
