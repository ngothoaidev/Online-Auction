# AI listing implementation verification

Implementation: branch `codex/ai-listing-assistant`, isolated worktree based on `origin/main` commit `0867786`. Existing uncommitted documentation in the original Online-Auction worktree was left untouched.

## Executed locally

Environment: Windows, Node 24.18.0, isolated PostgreSQL 18 on localhost:55432 with UTC database timezone. CI remains Node 22/PostgreSQL 16; the local runs do not claim to reproduce those versions.

- Backend unit suite: 38/38 passed, including offline preflight rejection of excessive price bounds, insufficient/inapplicable credits, expired dates and wrong model configuration. All evidence values in these tests are synthetic; no AWS access was verified by these tests.
- Full backend integration suite: 177/177 passed before the final three additional AI cases. The expanded AI integration file was then rerun: 12/12 passed, including three-photo multipart parsing, concurrent last-budget reservation and stale paid-call handling. These targeted reruns exercise the final backend service/config changes.
- Frontend complete test suite: 163/163 passed. The five assistant/editor tests passed again after UI refinements.
- Complete Playwright suite: 25/25 passed against the real local API, worker and PostgreSQL with the non-production fake AI adapter. The two AI E2E cases passed again after moving the assistant below Photos and displaying category names.
- Backend and frontend TypeScript checks passed; backend lint passed. Frontend lint has the existing 14 warnings, no errors; changed frontend files also passed focused lint. Frontend production build, TypeScript and targeted E2E passed after the final category-label/layout refinement.
- `git diff --check` passed. Drizzle generated the migration snapshot/journal; the migration was applied on disposable local databases.
- Fixture generator produced 30 original synthetic cases (15 English/15 Vietnamese) under ignored storage. No real-user photos were uploaded to an external AI service.

No AWS inference, cloud resources, keys, credit changes or production deployment were performed. The offline preflight command was smoke-tested using clearly synthetic prices/credit evidence; its success does not validate an AWS account. No live credits were consumed.

## Release gates still pending

The production default is disabled. Before enabling, the operator must verify applicable remaining credit, expiry, actual Nova Lite availability in us-east-1 and current pricing, configure a restricted expiring Bedrock bearer key, and run the reviewed preflight. After the controlled evaluation allowlist is enabled, evaluate 30 permitted representative real-photo samples and manually review facts and categories; run the offline scorer. Synthetic illustrations and fake-adapter tests do not satisfy factual-quality or real-provider latency gates.

Then run a Render staging smoke test and expand only the approved beta seller allowlist. Keep the permanent $5 ledger and five-cent reservation unchanged. The application ceiling applies to this workflow, not unrelated AWS account spending.

Operational/API documentation: [ai-listing.md](ai-listing.md).
