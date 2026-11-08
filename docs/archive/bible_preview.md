> Archived 2026-11-08. All steps done: the Bible reader works on the preview (BIBLE_ENABLED=1, Preview only). Production stays off until the launch steps in docs/bible_feature.md.

# Turn the Bible reader on for the latest preview

The Bible reader (BSB and WEB, public domain) is built but hidden: its pages return 404 until the web project has `BIBLE_ENABLED=1`. This checklist turns it on for **preview deployments only**. Production stays off until the launch steps in [bible_feature.md](bible_feature.md) (B8 compliance gate, B9 launch).

The flag is read from the server's environment on every request, so no code change is needed. A new variable only reaches a **new deployment**, so the redeploy in Part 2 is required.

---

## Part 0. Find the latest preview

- [ ] Vercel, project **`wotw-web`** (the website, not `wotw-api`), **Deployments**, filter **Preview**.
- [ ] Note the newest **Ready** one. At the time of writing it is `wotw-ifq2i5vui-thecodeblock.vercel.app`, built from branch `feat/1.3-kit-webhook-route`. Cancelled rows and `docs/**` branches (which never deploy) are not candidates.
- [ ] Open that deployment and note its branch alias, the address that never changes for the branch. For this branch it should look like `wotw-web-git-feat-13-kit-webhook-route-thecodeblock.vercel.app` (dots are dropped and slashes become dashes). Alias: ______________________________
- [ ] Optional: confirm the Bible is off first. Open `https://<alias>/bible`. You should get "Page not found".

---

## Part 1. Add the variable (Preview only)

- [ ] `wotw-web`, **Settings**, **Environment Variables**, **Add**.
- [ ] Name: `BIBLE_ENABLED`
- [ ] Value: `1` (exactly `1`; `true` or `yes` leave it off)
- [ ] Environments: tick **Preview** only. Leave **Production** and **Development** unticked.
- [ ] Not Sensitive (it is not a secret).
- [ ] Branch: leave the git branch field **empty** so every preview gets it. To limit it to one branch, choose the specific-branch option and type that branch name.
- [ ] Save.

---

## Part 2. Redeploy

- [ ] `wotw-web`, **Deployments**, filter **Preview**.
- [ ] Open the three dots on the deployment from Part 0 (the one holding your alias), choose **Redeploy**, and keep "use existing build cache" on.
- [ ] Wait for the new deployment to show **Ready**.
- [ ] Check the alias moved to the new deployment: open the new deployment and look for your alias under Domains.
- [ ] Alternative to redeploying: push a new commit to that branch (a docs-only push to a `docs/**` branch does not deploy).

---

## Part 3. Check it works

Open `https://<alias>/bible` in a desktop browser while logged in to Vercel (previews sit behind the Vercel login).

- [ ] The reader loads (no "Page not found").
- [ ] The header and footer show the **Bible** link (the navigation reads the same flag).
- [ ] The version switcher offers BSB and WEB. The ESV is not offered: it waits for Crossway's approval.
- [ ] Desktop (1024 px and wider): the passage button opens the **columns picker** (books with a filter, chapters, verses). Choose John, chapter 3, verses 16 to 18, press **Read**.
- [ ] The address now looks like `/bible/bsb/john/3?v=16-18`, and a page reload keeps the same passage.
- [ ] **Previous** and **Next** chapter buttons work, and so do the left and right arrow keys.
- [ ] Switch BSB to WEB: the passage changes and the choice is remembered when you open `/bible` again (a first-party `bible-version` cookie).
- [ ] Phone (or a browser narrowed below 1024 px): the picker is a **bottom sheet with three tabs** (Book, Chapter, Verses), and nothing applies until **Read**.
- [ ] Light and dark themes both read well, and nothing scrolls sideways.

---

## Part 4. If it does not show

- [ ] Still "Page not found": the new variable has not reached that deployment. Re-check Part 1 (Preview ticked, value exactly `1`) and redeploy the **deployment behind your alias**.
- [ ] Works on one preview but not another: that preview was built before the variable. Redeploy it, or push a commit to its branch.
- [ ] A 500 or a blank page: tell Claude Code the time and the alias. It reads the web logs for that deployment.

---

## Part 5. Turn it off again (optional)

- [ ] `wotw-web`, Settings, Environment Variables: delete `BIBLE_ENABLED` for Preview (or edit its value to `0`).
- [ ] Redeploy the preview, and `/bible` returns 404 again.

Locally the same flag is `BIBLE_ENABLED=1` in the root `.env` (do not `export` it in your shell: the unit tests read it).

---

## Part 6. Tell Claude Code

- [ ] Send the alias you used, so it can check the deployment and tick the preview step in [bible_feature.md](bible_feature.md).
