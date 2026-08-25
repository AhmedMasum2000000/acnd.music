# Ad Pro

**Assumption:** This repo was empty, so the product direction is speculative. This scaffold assumes "ad-pro" is an **ad campaign manager** — plan budgets, track delivery, read the numbers that matter. If the product is something different, the domain layer (`src/domain/campaign.ts`) is the only file that needs to change; everything else talks through a clean interface and stays valid.

**Real direction:** The user indicated the actual goal is a **grand website for a brand with content + SEO automation for lead generation**. When that domain is ready, swap `src/domain/campaign.ts` for the right types and rules, and the UI, storage layer, and every test stays put.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # serve the production build
```

## Development

**Before deploying**, run:

- `npm run typecheck` — compile TypeScript without output
- `npm test` — run Vitest suite (47 domain layer tests)
- `npm run build` — production Vite build

## How it's structured

- **`src/domain/campaign.ts`** — types and pure functions. No React, no I/O, no date-reading from the clock. This is the business logic and the only piece that changes when the product pivots. Everything else talks through the types exported here.
  
- **`src/domain/campaign.test.ts`** — Vitest suite covering validation, state transitions, metrics, pacing, portfolio rollups, and formatting. 47 tests, all passing.

- **`src/storage/repository.ts`** — `CampaignRepository` interface plus a localStorage implementation. Swap the implementation when the backend is ready.

- **`src/components/*.tsx`** — Form (validates, creates), List (filters statuses, deletes), Summary (portfolio metrics). React components, no business logic.

- **`src/styles/`** — Neutral light/dark tokens and global resets. Intentionally not the ACND site's cyberpunk look — different product, and sharing tokens would fight both designs.

## Moving this into the real repository

When `github.com/AhmedMasum2000000/ad-pro` gets access attached to this session:

1. Copy `ad-pro/` wholesale into the real repo root.
2. Bump the version in `package.json`.
3. Update the `README.md` to reflect the real product.
4. Swap `src/domain/campaign.ts` (or leave it if the product is actually an ad manager).
5. Swap `src/storage/repository.ts` when the backend is ready (POST endpoints, mutations, auth, whatever the real API looks like).

The build, tests, and CI all stay the same.

## Why it's here and not in the real repo

1. The real repo was unreachable from this session.
2. Building it here isolates it so the main ACND site build is not affected (nothing outside `ad-pro/` changed).
3. When access is granted, the whole directory can be lifted into the real repo cleanly, as a self-contained project.

## CI

A path-filtered GitHub Actions workflow will be added to `.github/workflows/ad-pro.yml` that:

- Runs on pushes to `ad-pro/**`
- Runs `npm ci && npm run typecheck && npm test && npm run build` in the `ad-pro/` directory
- Does not run when only ACND site files change

---

Built with Vite 6 + React 18 + TypeScript 5.7. Tests with Vitest. No external styling framework — CSS tokens only.
