---
# Copy this whole folder to content/devotionals/<series>-<number>-<short-title>/
# for example advent-02-the-long-wait. Folders starting with an underscore are ignored.
# Also put verse-card-dawn-patrol.png and verse-card-night-swell.png in the folder.
# Check your work with: pnpm check:devotionals (in apps/web).
title: Two to six words
publishAt: 2026-12-12 # YYYY-MM-DD. The devotional appears on the site from this day.
author: H
series: advent
seriesNumber: 2 # 1 for the first in the series
passages: ["Luke 1:5–25"] # main passages, shown in the surf report panel
summary: One sentence, up to 200 characters. Used as the email preview text and the search description.
emailSubject: Up to 80 characters
tags: [waiting, hope]
conditions: # the quoted verses at the top, ESV, checked against esv.org
  # Put verse numbers between carets, like ^13^. Type LORD in capitals where the ESV does.
  - text: "^13^The verse text."
    ref: "Luke 1:13 (ESV)"
reportConditions: Short phrase here # up to 30 characters, for the surf report panel
keyVerse: # the verse on the social verse card
  text: "The verse text."
  ref: "Luke 1:13 (ESV)"
imageAlt: Describe the verse card or illustration in one sentence.
sharePrompt: Know a mate who needs this? # optional, up to 80 characters, shown above Copy link
---

## The Lineup

The surf or everyday story that opens the devotional.

## The Word

What the passage says, in its context, and how it points to Jesus.

A line starting with > is shown as a pull quote.

## Paddle Out

One clear, doable application for the week.

## Pray

A short prayer. Amen.

## Go Deeper

**Talk it over with a mate:** One question.

**Read further:** Passages to read next.
