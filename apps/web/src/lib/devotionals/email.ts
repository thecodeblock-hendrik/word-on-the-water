import { ESV_NOTICE } from "../scripture.ts";
import { goDeeperItems, INLINE_MARKS, splitAmen, splitBlocks } from "./blocks.ts";
import type { Devotional } from "./parse.ts";

/** The series line and header image of an email. The image is optional: not every series has one. */
export type EmailSeries = { position: string; image?: { url: string; alt: string } };

/** Night swell (tokens.css) as hex, because email has no CSS variables. */
const BG = "#0f2233";
const SURFACE = "#152c40";
const DEEP = "#0a1825";
const LINE = "#28425a";
const INK = "#f4f1ea";
const MUTED = "#a9b7c2";
const ACCENT = "#4fa9a6";
const ACCENT_INK = "#6fc0bc";

// Fonts the site uses, with the system fonts email clients fall back to.
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Helvetica Neue',Arial,sans-serif";
const CONDENSED = "'Arial Narrow','Helvetica Neue',Arial,sans-serif";

// Kit's "Text only" template drops blockquote styling, so everything carries its own style.
const STYLE = {
  h1: `margin:8px 0 12px;font-family:${CONDENSED};font-size:36px;line-height:1.1;font-weight:700;color:${INK}`,
  kicker: `margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.3;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:${ACCENT_INK}`,
  h2: (color: string) =>
    `margin:32px 0 12px;font-family:${CONDENSED};font-size:16px;line-height:1.3;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:${color}`,
  p: `margin:0 0 16px;color:${INK}`,
  pull: `margin:0 0 16px;padding-left:16px;border-left:3px solid ${ACCENT};font-size:21px;line-height:1.45;font-style:italic;color:${INK}`,
  scripture: `margin:0 0 16px;padding:14px 18px;background:${SURFACE};border-left:3px solid ${ACCENT};font-style:italic;color:${INK}`,
  cite: `font-family:${SANS};font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-style:normal;color:${MUTED}`,
  sup: `font-family:${SANS};font-size:.65em;font-weight:600;font-style:normal;color:${ACCENT_INK}`,
  amen: `font-weight:600;letter-spacing:.2em;text-transform:uppercase;font-style:normal;color:${ACCENT}`,
  item: `margin:0 0 14px;font-family:${SANS};font-size:15.5px;color:${MUTED}`,
  link: `color:${ACCENT_INK}`,
  small: `margin:24px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${MUTED}`,
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Devotional text as email-safe HTML: marks become tags, everything else is escaped. */
function inline(text: string): string {
  return text
    .split(INLINE_MARKS)
    .map((part) => {
      if (part.startsWith("**")) return `<strong>${escape(part.slice(2, -2))}</strong>`;
      if (part.startsWith("*")) return `<em>${escape(part.slice(1, -1))}</em>`;
      if (part.startsWith("^")) return `<sup style="${STYLE.sup}">${part.slice(1, -1)}</sup>`;
      if (part === "LORD") return '<span style="font-variant:small-caps">Lord</span>';
      return escape(part);
    })
    .join("");
}

const h2 = (title: string, color = ACCENT_INK) => `<h2 style="${STYLE.h2(color)}">${title}</h2>`;

function prose(markdown: string): string[] {
  return splitBlocks(markdown).map(({ kind, text }) =>
    kind === "quote"
      ? `<blockquote style="${STYLE.pull}">${inline(text)}</blockquote>`
      : `<p style="${STYLE.p}">${inline(text)}</p>`,
  );
}

function conditions({ meta }: Devotional): string[] {
  const verses = meta.conditions.map(
    ({ text, ref }) =>
      `<blockquote style="${STYLE.scripture}">${inline(text)}<br><cite style="${STYLE.cite}">${escape(ref)}</cite></blockquote>`,
  );
  return [h2("Conditions"), ...verses];
}

/** A full-width table with a background colour: the one thing Outlook and Gmail both respect. */
const panel = (bg: string, inner: string, style = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background:${bg};${style}"><tr><td>${inner}</td></tr></table>`;

/** Paddle Out sits on the deeper panel, as on the site. */
function paddleOut(markdown: string): string {
  const inner = [h2("Paddle Out", ACCENT), ...prose(markdown)].join("\n");
  return panel(DEEP, `<div style="padding:1px 22px 6px">${inner}</div>`, "margin:8px 0");
}

function prayer(markdown: string): string[] {
  const { body, amen } = splitAmen(markdown);
  const closing = amen ? ` <span style="${STYLE.amen}">${amen}</span>` : "";
  return [h2("Pray"), `<p style="${STYLE.p}"><em>${inline(body)}</em>${closing}</p>`];
}

function goDeeper(markdown: string): string[] {
  const items = goDeeperItems(markdown).map(
    ({ term, text }) =>
      `<p style="${STYLE.item}"><strong style="color:${INK}">${escape(term)}</strong><br>${inline(text)}</p>`,
  );
  return [
    `<div style="margin-top:28px;border-top:1px solid ${LINE}">`,
    h2("Go Deeper"),
    ...items,
    "</div>",
  ];
}

function header(title: string, series?: EmailSeries): string {
  const image = series?.image
    ? `<img src="${escape(series.image.url)}" alt="${escape(series.image.alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0">`
    : "";
  const position = series ? `<p style="${STYLE.kicker}">${escape(series.position)}</p>` : "";
  return [
    image,
    `<div style="padding:0 24px">`,
    position,
    `<h1 style="${STYLE.h1}">${escape(title)}</h1>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The email body for a devotional in the Night swell look, as a fragment (Kit wraps it in the
 * page). Kit adds the unsubscribe link and postal address itself (2.4 spike, ADR 0008), so they
 * are not written here.
 */
export function devotionalEmailHtml(
  devotional: Devotional,
  { siteUrl, series }: { siteUrl: string; series?: EmailSeries },
): string {
  const text = (name: string) => devotional.sections.find((s) => s.heading === name)?.markdown;
  const section = (name: string) => [h2(name), ...prose(text(name)!)];
  const deeper = text("Go Deeper");
  const link = `${siteUrl.replace(/\/$/, "")}/devotionals/${devotional.slug}`;

  const body = [
    ...conditions(devotional),
    ...section("The Lineup"),
    ...section("The Word"),
    paddleOut(text("Paddle Out")!),
    ...prayer(text("Pray")!),
    ...(deeper ? goDeeper(deeper) : []),
    `<p style="${STYLE.p};margin-top:24px"><a href="${link}" style="${STYLE.link}">Read it on the website</a></p>`,
    `<p style="${STYLE.small}">${escape(ESV_NOTICE)}</p>`,
  ].join("\n");

  const column = [
    header(devotional.meta.title, series),
    `<div style="padding:0 24px 32px">`,
    body,
    "</div>",
  ].join("\n");
  const page = `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;text-align:left"><tr><td>${column}</td></tr></table>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG};color:${INK};font-family:${SERIF};font-size:17px;line-height:1.65"><tr><td align="center">${page}</td></tr></table>`;
}
