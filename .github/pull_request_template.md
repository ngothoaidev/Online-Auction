## What
<!-- The change in one or two sentences. Link the task/requirement (e.g. T21, R17). -->

## Why
<!-- Finding -> cause -> this change. Business rule (ADR) if the domain changes. -->

## Migration
- [ ] No schema change
- [ ] New migration `drizzle/00NN_*.sql` — preflight/backfill/recovery described below; forward-only (rollback = restore)

## Tests
<!-- Commands actually run and their results. Negative/concurrent cases for domain changes. -->
- [ ] `backend`: `npm run lint && npm run test:unit && npm run test:integration`
- [ ] `frontend`: `npm run lint && npm test && npm run build`
- [ ] `npx playwright test` (UI or cross-module changes)
- [ ] a11y/reflow (`scripts/qa-a11y.mjs`, `scripts/qa-reflow.mjs`) for UI changes

## Risks and follow-ups
<!-- What could break, what is not covered, what is left open (keep requirements open rather than over-claim). -->

## Checklist
- [ ] No secrets, personal data or bidder maxima in code, logs, fixtures or screenshots
- [ ] Money stays integer strings/BigInt; state changes go through the command services
- [ ] Docs updated (API, runbook, feature matrix) when behaviour or operations change
