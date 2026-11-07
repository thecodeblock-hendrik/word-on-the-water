// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { PickVerses } from "@/components/bible/pick-verses";
import { findBook } from "@/lib/bible/books";
import type { PickerState } from "@/lib/bible/picker";

afterEach(cleanup);

const whole: PickerState = { version: "bsb", book: "john", chapter: 3, from: null, to: null };

it("two pickers on one page keep their own choice (the hidden column and the open sheet)", () => {
  const book = findBook("john")!;
  render(
    <>
      <PickVerses book={book} state={whole} onChange={() => {}} />
      <PickVerses book={book} state={whole} onChange={() => {}} />
    </>,
  );
  const wholeChapter = screen.getAllByRole("radio", { name: /Whole chapter/ });
  expect(wholeChapter).toHaveLength(2);
  expect(wholeChapter[0]).toBeChecked();
  expect(wholeChapter[1]).toBeChecked();
});
