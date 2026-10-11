# Online Auction

React/Vite/Tailwind frontend + Express/PostgreSQL/Drizzle backend.

## Local setup
```bash
docker compose up -d db                 # PostgreSQL on localhost:55432 (db auction + auction_test)
cp backend/.env.example backend/.env    # then set DATABASE_URL=postgres://auction:auction@localhost:55432/auction
cd backend && npm ci && npm run db:migrate && npm run db:seed && npm run dev
cd frontend && npm ci && npm run dev
```
## Checks
- backend: `npm run lint`, `npm run test:unit`, `npm run test:integration` (needs PostgreSQL; uses `auction_test`, refuses other DBs)
- frontend: `npm run lint`, `npm test`, `npm run build`

Upgrade plan & progress: `.kiro/specs/online-auction-upgrade/`; baseline and ADRs: `docs/`.
