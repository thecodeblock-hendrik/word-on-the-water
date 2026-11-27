import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const tokens = read("../../src/styles/tokens.css");
const globals = read("../../src/app/globals.css");

/** The declarations of the first rule whose selector line is exactly `selector`. */
function rule(css: string, selector: string) {
  const lines = css.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${selector} {`);
  if (start < 0) throw new Error(`no rule ${selector}`);
  const end = lines.findIndex((line, i) => i > start && line.trim() === "}");
  return lines.slice(start + 1, end).join("\n");
}

function token(block: string, name: string) {
  const found = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!found) throw new Error(`no token --${name}`);
  return found[1].trim();
}

const schemes = {
  light: rule(tokens, ":root"),
  "dark (device setting)": rule(tokens, ':root:not([data-theme="light"])'),
  "dark (theme toggle)": rule(tokens, ':root[data-theme="dark"]'),
};

type Rgb = number[];
const hex = (value: string): Rgb => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));

/** `rgb(r g b / a)` as its colour and alpha. */
function rgba(value: string): [Rgb, number] {
  const [r, g, b, a] = value.match(/[\d.]+/g)!.map(Number);
  return [[r, g, b], a];
}

const over = (top: Rgb, alpha: number, under: Rgb) =>
  top.map((channel, i) => channel * alpha + under[i] * (1 - alpha));

function luminance(colour: Rgb) {
  const [r, g, b] = colour.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe.each(Object.entries(schemes))("glass labels, %s", (name, block) => {
  // The worst thing that can be behind the glass. Blur only averages, so a page cannot be worse.
  const backdrop = hex(name === "light" ? "#000000" : "#ffffff");
  const glass = () =>
    over(hex(token(block, "surface")), parseFloat(token(block, "glass-tint")) / 100, backdrop);
  const ink = () => hex(token(block, "ink"));

  it("reach 4.5:1 on the glass over the worst backdrop", () => {
    expect(contrast(ink(), glass())).toBeGreaterThanOrEqual(4.5);
  });

  it("reach 4.5:1 on the pill over the worst backdrop", () => {
    const [colour, alpha] = rgba(token(block, "glass-lens"));
    expect(contrast(ink(), over(colour, alpha, glass()))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the two dark blocks", () => {
  it.each(["glass-tint", "glass-lens", "glass-rim", "glass-edge", "glass-shadow"])(
    "agree on --%s",
    (name) => {
      expect(token(schemes["dark (device setting)"], name)).toBe(
        token(schemes["dark (theme toggle)"], name),
      );
    },
  );
});

describe("the shared glass classes", () => {
  it("make a 64px capsule, tinted and blurred, from tokens only", () => {
    const bar = rule(globals, ".glass-bar");
    expect(bar).toContain("height: 4rem;");
    expect(bar).toContain("color-mix(in srgb, var(--surface) var(--glass-tint), transparent)");
    expect(bar).toContain("-webkit-backdrop-filter: blur(18px) saturate(180%);");
    expect(bar).toMatch(/^\s*backdrop-filter: blur\(18px\) saturate\(180%\);/m);
    expect(bar).toContain("var(--glass-rim)");
    expect(bar).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("float it 1rem in from the sides and clear of the home indicator", () => {
    const dock = rule(globals, ".glass-dock");
    expect(dock).toContain("left: max(1rem, env(safe-area-inset-left));");
    expect(dock).toContain("right: max(1rem, env(safe-area-inset-right));");
    expect(dock).toContain("bottom: max(0.875rem, env(safe-area-inset-bottom));");
  });

  it("draw the pill from tokens only", () => {
    const pill = rule(globals, ".glass-pill");
    expect(pill).toContain("background: var(--glass-lens);");
    expect(pill).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});
