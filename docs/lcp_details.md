# Devotional page LCP investigation

Started 2026-11-16 on branch `fix/devotional-lcp`. Part of PLAN.md 1.8 (Lighthouse CI, LCP under 2.0 s). Status: **real LCP fixed by not preloading Barlow (committed); the simulated LCP of about 3.1 s is still open.**

## The problem

`/devotionals/advent-01-more-than-watchmen` scores 0.94 with a simulated LCP of 3.1 s. The landing page scores 1.0 with 0.9 s. Observed (unthrottled) LCP is about 133 ms, so the real load is fast.

## Method

- `pnpm build`, then ONE server: `DEVOTIONAL_TODAY=2026-12-05 SITE_URL=http://localhost:3200 pnpm start -p 3200`.
- One run at a time with `lhci collect` and a scratch config (mobile emulation, performance only). Blocking a resource is done with `settings.blockedUrlPatterns`.
- Two throttling modes: `simulate` (the default, what CI asserts on) and `devtools` (real network throttling).

## Proven findings

1. **The LCP element is the series art** (`img` in `.when-dark` on a dark OS, `.when-light` otherwise). Both art images load (the hidden one at Low priority). Blocking the hidden one changes nothing. Blocking the visible one makes the LCP 0.9 s (text becomes the LCP).
2. **Why the simulation is harsh.** Lighthouse's simulated LCP for an image is the finish time of every non-low-priority request that started before the observed LCP (scripts, fonts, favicon, CPU layout). A text LCP only counts render-blocking requests. The observed LCP is at about 82 ms, so nearly all requests count. Source: `@paulirish/trace_engine` `lantern/metrics/LargestContentfulPaint.js`. In the report, `lcpLoadDelay` is 940 ms: the image request starts late in the simulation.
3. **Real throttling agrees in direction** (`throttlingMethod: devtools`): devotional FCP 1.7 s, LCP 2.4 s; landing FCP 1.7 s, LCP 1.7 s. So about 0.7 s of the gap is the image arriving late.
4. **Fonts are the competitor.** With real throttling, blocking all `*.woff2` gives LCP 1.5 s (from 2.4 s). Blocking scripts (`*.js`) or the dawn image changes nothing (2.3 s). Six font files (about 118 KB, High priority) are preloaded on every page and compete with the 5 KB image for bandwidth.
5. **Per family, real throttling** (clean server, but on the build with the Lora preload off, which made no difference): blocking the three Barlow files (400, 500, 600) gives LCP 1.6 s; blocking the two Barlow Condensed files (600, 700) also gives 1.6 s (baseline 2.4 s). So no single family is to blame: the total font bytes and the number of parallel requests ahead of the image are what delay it. Dropping either group's preload should recover most of the gain.
6. Under simulation, blocking fonts alone does not help (3.2 s), blocking scripts alone gives 2.3 s, both together 2.1 s. So the simulated figure has more than one contributor.

7. **Fix applied (2026-11-16): `preload: false` on Barlow (400/500/600) in `apps/web/src/app/layout.tsx`.** Barlow Condensed (the h1) and Lora stay preloaded. Clean build and server, 3 runs each, devotional page:

   | Config | CLS | LCP real (devtools) | LCP simulated |
   |---|---|---|---|
   | All fonts preloaded (before) | 0.0001 | 2.36 s | 3.09 s |
   | No font preloads | 0.035 | 1.58 s | about 3.0 s |
   | Barlow Condensed and Lora preloaded (committed) | 0.0001 | 1.64 s | 3.10 s |

   Dropping the Condensed preload shifts the layout (the figure moves when the h1 and summary reflow after the font swap), so that one must stay. The landing page also gains (real LCP 1.74 s to 1.63 s).
8. **`fetchpriority="high"` instead of `priority`: worse, reverted.** It also removes the preload links and eager loading, so both art images became `loading="lazy"`: real LCP 2.87 s, simulated unchanged at 3.09 s. `priorityHinted` is not what drives the simulated figure.
9. **The art is not the cause of any shift.** The figure has a fixed `aspect-[4/3] sm:aspect-[21/9]` box and the images are `absolute inset-0`. The audit's "750 x 1200" is the optimizer's output for the 2833 x 4533 portrait source (the files are named `.png` but are JPEG), cropped by `object-cover`; it costs bytes, not layout.

## Retracted (do not rely on)

- "Turning off the Lora preload fixes it (2.4 s to 1.4 s)": **invalid.** A stray `next start` (pid 7143) kept port 3200 because `pkill -f "next start"` does not match its process name, and it served a `.next` folder rebuilt under it. A clean re-test gave no change: simulated 0.94 and 3.09 s, real 2.4 s. The change was reverted.
- The `pnpm lighthouse` a11y 0.97 and best-practices 0.88 failures in that session came from the same broken server. A clean run showed only the known devotional performance failures.

## Lessons for the next session

- Before every measurement: `lsof -ti :3200` must show exactly the one server you started. Kill with `kill <pid>`, not `pkill`.
- Never rebuild while a server runs on the same `.next`.
- `pnpm lighthouse` starts its own server on 3200: stop yours first.

## Next checks (one at a time, clean server each)

1. Done: font preloads (finding 7), `fetchpriority` (finding 8), art dimensions (finding 9).
2. Re-measure on a deployed preview (HTTP/2, no 6-connection limit). Earlier preview readings: simulated LCP 2.4 to 3.1 s, observed 0.8 to 1.3 s.
3. Find what else the simulation counts before the observed LCP (scripts, favicon, CPU layout); finding 6 says fonts and scripts together gave 2.1 s.
4. If the simulated figure cannot be brought under 2.0 s: keep the devotional LCP assert at `warn`, record the real-throttling evidence, and make the job required for the landing page and the other metrics. Otherwise tighten to `error`, make the CI job required and tick PLAN.md 1.8.

## Housekeeping

- `docs/next_steps.md` was moved to `docs/archive/next_steps.md` by someone other than this session; it shows as deleted and untracked in `git status`. Not staged here.
- The only code change on the branch is the Barlow `preload: false` (finding 7).
