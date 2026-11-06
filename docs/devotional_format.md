# Devotional format

How a weekly devotional gets onto the website. Your working file (study notes, reviewers, checklists) stays outside the repo. Only the publishable file below goes in.

## Each week

1. Write and review as usual, through Step 9 of your template.
2. Copy `apps/web/content/devotionals/_template/` to a new folder named `<series>-<number>-<short-title>`, for example `advent-02-the-long-wait`. The series must already exist (see "Series" below).
3. Fill in the header (Step 9 answers map straight onto it) and paste the sections.
4. Add the two verse cards to the folder, named exactly `verse-card-dawn-patrol.png` and `verse-card-night-swell.png`.
5. In `apps/web`, run `pnpm check:devotionals`. It lists every devotional or says exactly what is wrong.
6. Open a pull request, check the preview at 375px, merge. The devotional appears on its `publishAt` date.

The email still goes out from Kit.

## The file: `devotional.md`

A header block between `---` lines, then these sections in this order. Go Deeper is optional; the rest are required. Nothing else is allowed, and nothing may come before the first heading.

```
## The Lineup
## The Word
## Paddle Out
## Pray
## Go Deeper
```

| Header field | Meaning |
|---|---|
| `title` | 2 to 60 characters |
| `publishAt` | `YYYY-MM-DD`. Shown on the site from this day |
| `author` | Writer's name |
| `series`, `seriesNumber` | The series folder name and the week, for example `advent` and `1`. A number may be used once per series and must be in that series' outline. "1 of 5" is worked out from the outline |
| `passages` | Main passages, shown in the surf report panel |
| `summary` | Up to 200 characters. Email preview text and search description |
| `emailSubject` | Up to 80 characters |
| `tags` | At least one |
| `conditions` | The quoted verses at the top: a `text` and a `ref` each, ESV. Put verse numbers between carets, like `^5^` |
| `reportConditions` | Up to 30 characters, for the surf report panel |
| `keyVerse` | `text` and `ref` for the social verse card |
| `imageAlt` | Alt text for the verse card |
| `sharePrompt` | Optional, up to 80 characters, shown beside Copy link. Default: "Know a mate who needs this?" |

Unknown header fields are rejected, so a typo such as `autor` is caught.

## Writing conventions

- `*italic*` and `**bold**` work in every section.
- `^5^` shows a small verse number.
- Type **LORD** in capitals exactly as the ESV prints it. The site shows it in small capitals. Type "Lord" where the ESV does.
- A line starting with `> ` in any section is shown as a pull quote (website only).
- The prayer's closing "Amen." is styled by the site.
- Go Deeper has one paragraph per item, written `**Label:** text`. The site adds "Next week: ..." to the "Read further" item.

## Series

A series is described once, in `apps/web/content/series/<name>/`, not in every devotional:

- `series.yml`: the title, a tagline, the illustration's alt text, and the outline, one entry per planned week (number, working title, passage, date).
- `art-dawn-patrol.png` and `art-night-swell.png`: the series illustration for each colour scheme (about 1600 by 686).

Copy `content/series/_template/` to start a new series. The outline drives "Advent 1 of 5", the series list beside the article and the Next link. Once a week's `devotional.md` exists, its own title, passage and date replace the outline's working title. A week only becomes a link once it is published.

The site shows the verse card and series art that match the visitor's colour scheme.

## What the site works out itself

- Read time, from the word count (200 words a minute).
- The ESV copyright notice.
- Which devotional is the latest published one.
- The series position, series list, and the Next and Previous links.
- The surf report panel (the topics are the first two tags that are not the series name).

## Rules

- Check every verse word for word against esv.org, including LORD in capitals where the ESV uses it.
- Never put study notes, reviewer names or real prayer requests in this folder. The repository is public.
- The `content/` folder is not reformatted by Prettier, so your wording and punctuation are kept as written.
