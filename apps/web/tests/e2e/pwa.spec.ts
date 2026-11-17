import { expect, test, type APIRequestContext } from "@playwright/test";

type Image = { src: string };
type Manifest = {
  icons: Image[];
  screenshots: Image[];
  shortcuts: { url: string; icons: Image[] }[];
};

async function loadManifest(request: APIRequestContext) {
  const response = await request.get("/manifest.webmanifest");
  return { response, manifest: (await response.json()) as Manifest };
}

test("the page links the manifest, the apple icon and the iOS settings", async ({ page }) => {
  await page.goto("/");
  const head = async (selector: string, attribute: string) =>
    page.locator(selector).first().getAttribute(attribute);

  expect(await head('link[rel="manifest"]', "href")).toBe("/manifest.webmanifest");
  expect(await head('link[rel="apple-touch-icon"]', "sizes")).toBe("180x180");
  expect(await head('meta[name="apple-mobile-web-app-title"]', "content")).toBe("WotW");
  expect(await head('meta[name="viewport"]', "content")).toContain("viewport-fit=cover");
  const colours = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("media")));
  expect(colours).toEqual(["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"]);
});

test("the manifest loads as a manifest and lists a 512 maskable icon", async ({ request }) => {
  const { response, manifest } = await loadManifest(request);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  expect(manifest.icons.map((i) => i.src)).toContain("/icons/icon-maskable-512.png");
});

test("every icon, shortcut icon and screenshot in the manifest is a PNG that loads", async ({
  request,
}) => {
  const { manifest } = await loadManifest(request);
  const urls = [
    ...manifest.icons,
    ...manifest.shortcuts.flatMap((s) => s.icons),
    ...manifest.screenshots,
  ].map((i) => i.src);
  expect(urls.length).toBeGreaterThanOrEqual(7);

  for (const url of new Set(urls)) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()["content-type"], url).toBe("image/png");
  }
  for (const url of ["/icon.svg", "/apple-icon.png"]) {
    expect((await request.get(url)).status(), url).toBe(200);
  }
});

test("every shortcut opens a page", async ({ request }) => {
  const { manifest } = await loadManifest(request);
  for (const { url } of manifest.shortcuts) {
    expect((await request.get(url.split("#")[0])).ok(), url).toBe(true);
  }
});

test("the policy lets the page use the manifest and every icon, with no violation", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  const response = await page.goto("/");
  const csp = response?.headers()["content-security-policy"] ?? "";
  // manifest-src falls back to default-src 'self'; a narrower rule would block it.
  expect(csp).not.toMatch(/manifest-src/);
  expect(csp).toMatch(/default-src 'self'/);

  const { manifest } = await loadManifest(page.request);
  const loaded = await page.evaluate(
    (srcs) =>
      Promise.all(
        srcs.map(
          (src) =>
            new Promise<boolean>((resolve) => {
              const image = new Image();
              image.onload = () => resolve(true);
              image.onerror = () => resolve(false);
              image.src = src;
            }),
        ),
      ),
    [...manifest.icons, ...manifest.screenshots].map((i) => i.src),
  );
  expect(loaded.every(Boolean)).toBe(true);
  expect(violations).toEqual([]);
});
