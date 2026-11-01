## What

## Why

## Mobile screenshots
Screenshots at 375px for any UI change. Write "Not applicable" otherwise.

## Security considerations
Personal data handled, new endpoints or inputs, secrets, logging. Write "None" only after checking.

## Tests
What was added and which behaviours it proves. Tests are written first (see the testing approach in `docs/PLAN.md`).

## Checklist
- [ ] `make lint typecheck test` pass (and `make e2e` for UI changes)
- [ ] `make types` run if the API schema changed
- [ ] Migrations are backward compatible
- [ ] No secrets, real prayer requests or subscriber data in the diff
- [ ] `docs/PLAN.md` and docs updated
