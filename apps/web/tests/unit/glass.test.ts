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

/** A whole block, nested rules included, found by its first line. */
function wholeBlock(css: string, opening: string) {
  const start = css.indexOf(`${opening} {`);
  if (start < 0) throw new Error(`no block ${opening}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unclosed block ${opening}`);
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
  it("make the glass, tinted and blurred, from tokens only", () => {
    const surface = rule(globals, "@utility glass-surface");
    expect(surface).toContain("color-mix(in srgb, var(--surface) var(--glass-tint), transparent)");
    expect(surface).toContain("-webkit-backdrop-filter: blur(18px) saturate(180%);");
    expect(surface).toMatch(/^\s*backdrop-filter: blur\(18px\) saturate\(180%\);/m);
    expect(surface).toContain("var(--glass-rim)");
    expect(surface).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("give the glass alone no size and no hold on touches, for the Undo shelf", () => {
    expect(wholeBlock(globals, "@utility glass-surface")).not.toMatch(
      /height|padding|touch-action|user-select|border-radius/,
    );
  });

  it("make the bar a 64px capsule of that glass", () => {
    const bar = rule(globals, "@utility glass-bar");
    expect(bar).toContain("height: 4rem;");
    expect(bar).toContain("border-radius: 9999px;");
    expect(bar).toContain("@apply glass-surface;");
  });

  it("float it 1rem in from the sides and clear of the home indicator", () => {
    const dock = rule(globals, "@utility glass-dock");
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

describe("holding and sliding on the bar", () => {
  it.each([
    "touch-action: none;",
    "-webkit-user-select: none;",
    "user-select: none;",
    "-webkit-touch-callout: none;",
  ])("is not interrupted by scrolling, text selection or link previews: %s", (declaration) => {
    expect(rule(globals, "@utility glass-bar")).toContain(declaration);
  });
});

describe("the solid fallbacks", () => {
  const bar = () => wholeBlock(globals, "@utility glass-surface");

  it("is solid in a browser that cannot blur what is behind it", () => {
    const rule = wholeBlock(
      bar(),
      "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))",
    );
    expect(rule).toContain("background: var(--surface);");
  });

  it("is solid, with a stronger edge, for reduced transparency or increased contrast", () => {
    const rule = wholeBlock(
      bar(),
      "@media (prefers-reduced-transparency: reduce), (prefers-contrast: more)",
    );
    expect(rule).toContain("background: var(--surface);");
    expect(rule).toContain("backdrop-filter: none;");
    expect(rule).toContain("-webkit-backdrop-filter: none;");
    expect(rule).toContain("border-color: var(--muted);");
  });

  it("uses system colours in forced-colours mode, for the bar and the pill", () => {
    const rule = wholeBlock(bar(), "@media (forced-colors: active)");
    expect(rule).toContain("background: Canvas;");
    expect(rule).toContain("border-color: CanvasText;");
    expect(wholeBlock(globals, "@layer components")).toMatch(
      /@media \(forced-colors: active\) \{\s*\.glass-pill \{\s*border: 2px solid Highlight;/,
    );
  });
});

describe("the Undo shelf and the bar under it", () => {
  const css = globals.replace(/\/\*[\s\S]*?\*\//g, "");
  const below = wholeBlock(css, "@media (width < 64rem)");
  const outside = css.replace(below, "");
  const flat = below.replace(/\s+/g, " ");

  it("only touch each other below lg", () => {
    expect(outside).not.toContain("data-shelf");
  });

  it("make the shelf 52px alone, and 52px more than the bar where there is one", () => {
    expect(flat).toContain("[data-shelf] { height: calc(3.25rem + 2px);");
    expect(flat).toContain(
      ":root:has(nav[data-hides]) [data-shelf] { height: calc(3.25rem + 4rem); }",
    );
  });

  it("switch off the bar's own glass only while the shelf is there, so there is one pane", () => {
    expect(flat).toContain(
      ":root:has([data-shelf]) nav[data-hides] { border-color: transparent; background: transparent; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }",
    );
  });

  it("draw a hairline between them, from the glass edge", () => {
    expect(flat).toContain(
      ":root:has(nav[data-hides]) [data-shelf-row] { border-bottom: 1px solid var(--glass-edge); }",
    );
  });

  it("leave no trace of the old popup's fade", () => {
    expect(css).not.toContain("toast-in");
  });
});
