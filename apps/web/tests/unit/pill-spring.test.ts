import { describe, expect, it } from "vitest";

import { pillAt, type Span, squash, stepPill } from "@/lib/nav/pill-spring";

const FRAME = 1 / 60;
const first: Span = { left: 4, right: 114 };
const third: Span = { left: 224, right: 334 };

/** Every frame of a move at 60 per second, up to the one that settles. */
function move(from: Span, to: Span, frame = FRAME) {
  let pill = pillAt(from);
  const frames = [];
  for (let i = 0; i < 600; i++) {
    const next = stepPill(pill, to, frame);
    pill = next.pill;
    frames.push({ left: pill.left.x, right: pill.right.x, settled: next.settled });
    if (next.settled) return frames;
  }
  throw new Error("never settled");
}

const width = (span: { left: number; right: number }) => span.right - span.left;

describe("the pill's spring", () => {
  it("starts at rest where it is put", () => {
    expect(pillAt(first)).toEqual({ left: { x: 4, v: 0 }, right: { x: 114, v: 0 } });
  });

  it.each([
    ["rightward", first, third, "right", "left"],
    ["leftward", third, first, "left", "right"],
  ] as const)("moving %s, the edge nearer the target leads", (_, from, to, lead, trail) => {
    const early = move(from, to)[5];
    const travelled = (edge: "left" | "right") =>
      (early[edge] - from[edge]) / (to[edge] - from[edge]);
    expect(travelled(lead)).toBeGreaterThan(travelled(trail));
    expect(width(early)).toBeGreaterThan(width(from) + 10);
  });

  it("moves the same way in both directions", () => {
    const mirror = (x: number) => first.left + third.right - x;
    const there = move(first, third);
    const back = move(third, first);
    expect(back).toHaveLength(there.length);
    back.forEach((frame, i) => {
      expect(frame.left).toBeCloseTo(mirror(there[i].right), 6);
      expect(frame.right).toBeCloseTo(mirror(there[i].left), 6);
    });
  });

  it("overshoots a little, never wildly", () => {
    const furthest = Math.max(...move(first, third).map((f) => f.right));
    const past = furthest - third.right;
    expect(past).toBeGreaterThan(0.5);
    expect(past).toBeLessThan((third.right - first.right) * 0.1);
  });

  it("settles exactly on the target within 1.2 seconds, and then stays", () => {
    const frames = move(first, third);
    expect(frames.length * FRAME).toBeLessThan(1.2);
    expect(frames.at(-1)).toEqual({ ...third, settled: true });
    expect(frames.slice(0, -1).some((f) => f.settled)).toBe(false);
    let pill = pillAt(third);
    const again = stepPill(pill, third, FRAME);
    pill = again.pill;
    expect(again.settled).toBe(true);
    expect(pill).toEqual(pillAt(third));
  });

  it("takes a very long frame (a hidden tab) as a short one, so it cannot fly off", () => {
    expect(stepPill(pillAt(first), third, 5)).toEqual(stepPill(pillAt(first), third, 0.032));
  });

  it("stays within bounds at 30, 60 and 120 frames a second", () => {
    for (const rate of [30, 60, 120]) {
      for (const frame of move(first, third, 1 / rate)) {
        expect(frame.left).toBeGreaterThanOrEqual(first.left - 1);
        expect(frame.right).toBeLessThanOrEqual(third.right + 25);
      }
    }
  });

  it("does not change the pill it is given", () => {
    const pill = pillAt(first);
    stepPill(pill, third, FRAME);
    expect(pill).toEqual(pillAt(first));
  });
});

describe("the pill's squash", () => {
  it("is full height at its resting width, or narrower", () => {
    expect(squash(110, 110)).toBe(1);
    expect(squash(60, 110)).toBe(1);
  });

  it("thins as it stretches, and never below 0.82", () => {
    expect(squash(150, 110)).toBeLessThan(1);
    expect(squash(150, 110)).toBeGreaterThan(squash(180, 110));
    expect(squash(5000, 110)).toBe(0.82);
  });
});
