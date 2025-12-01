# Finding Nakamoto – sBTC Cool Wallet Automation Demo

Finding Nakamoto is the reference build for the **sBTC.cool** experience: a browser-based dashboard that shows how to pair self-custodied Stacks wallets with tightly scoped automation flows. The goal is to demonstrate how Stacks builders can walk users from "connect wallet" to "run recurring swap strategies" without ever leaving the interface.

> Grant issue: [stacksgov/decentralized-grants#59](https://github.com/stacksgov/decentralized-grants/issues/59)

## What This App Demonstrates
- Holding Wallet tab for classic self-custody: create/restore keys, export seeds, and manually initiate transfers.
- Trading Wallet tab for policy-guarded automations that can DCA into sBTC then sweep returns to a trusted destination.
- Automation tab that chains swaps and transfers, surfaces live Hiro txids, and highlights how to orchestrate Stacks jobs from the browser.
- Turnkey is used strictly for **account abstraction** (passkey/OAuth login + wallet kit UX). Every automation flow requires the user to opt in and keeps custody constraints transparent.

## Architecture Overview
- **Front end**: Next.js 15 App Router with React 19, Tailwind CSS v4, `next-themes`, and client-only entry points (`src/app/page.tsx`, `src/app/components/*`). Zustand caches wallet metadata to avoid thrashing the Turnkey APIs.
- **Wallet kit provider**: `@turnkey/react-wallet-kit` wraps the tree (`src/app/providers/TurnkeyProvider.tsx`) so the UI can authenticate, derive Stacks accounts (`m/44'/5757'`), and sign payloads without exposing raw private keys.
- **Server routes**: Next Route Handlers under `src/app/api` provision trading orgs, call Hiro endpoints, and delegate signing via `@turnkey/sdk-server`.
- **Database**: Drizzle ORM + Postgres capture Turnkey organization IDs, wallet IDs, and derived account metadata for fast automation lookups (`src/lib/db/schema.ts`).
- **Automation loop**: `/api/turnkey/automation-step` stitches swap + transfer endpoints, fetches fresh nonces from Hiro, and returns txids back to the client for progress reporting.

## Tools & Services
- Next.js 15.5 w/ React 19, Tailwind 4, and TypeScript 5 for the UI.
- `@turnkey/react-wallet-kit` + `@turnkey/sdk-server` for account abstraction only (passkey auth, wallet creation, delegated signatures).
- `@stacks/transactions` for deriving addresses and building swap/transfer payloads.
- Drizzle ORM + `postgres` client for persistence, alongside Drizzle Kit for migrations.
- Zustand state slices (`src/store/useTurnkeyStore.ts`) to memoize wallet fetches.
- Hiro API helpers (`src/lib/hiro-api-helpers.ts`) rotate API keys when fetching balances, nonces, or broadcasting transactions.

## How the Flow Works
### 1. Holding Wallet (client-side)
- The Turnkey provider injects `handleLogin`, `createWallet`, `createWalletAccounts`, and an authenticated `httpClient`.
- Users authenticate with passkeys/OAuth via Wallet Kit, derive Stacks accounts, and sign transfers directly in the browser.
- No automation is triggered here—this is the pure self-custody surface that demonstrates account abstraction UX.

### 2. Trading Wallet Provisioning (server-side)
- `/api/turnkey/grant-access` (Next Route Handler) accepts a logged-in user ID, spins up a Turnkey sub-organization, inserts the delegate API key, and seeds a trading wallet with Stacks derivation paths.
- A cron-compatible endpoint (`/api/cron/fetchSubOrgs`) syncs those sub-orgs + wallets into Postgres so the dashboard can query them without hammering Turnkey directly.
- `/api/db/trading-wallets` exposes the cached org/wallet/account tree to the Automation tab.

### 3. Automation Pipeline
- The Automation UI flattens trading wallets and lets the user select swap direction, cadence, slippage, and destination safeguards.
- Each step POSTs to `/api/turnkey/automation-step`, which:
  1. Finds the account metadata in Postgres and derives the Stacks address from its public key.
  2. Fetches a fresh nonce from Hiro (`extended/v1/address/{addr}/nonces`).
  3. Calls the appropriate `/api/stacks/*` endpoint to build + sign swaps or transfers via Turnkey’s delegated API key.
  4. Broadcasts to Hiro, returning txids so the UI can animate status updates.

## Local Development
```bash
npm install
npm run dev # http://localhost:5002
```

Environment variables live in `.env.local`. At a minimum you will need the Turnkey base URL, organization ID, auth proxy config ID, delegated API keys, Hiro API keys, and `NEXT_PUBLIC_APP_URL`. See `src/app/providers/TurnkeyProvider.tsx` and the route handlers under `src/app/api` for the exact names.

## Reference Docs
- `docs/turnkey_stacks.md` – in-depth Turnkey + Stacks integration guide.
- `src/app/api/turnkey/automation-step/route.ts` – orchestration logic for multi-step jobs.
- `src/lib/db/queries.ts` – helpers for reading/writing cached trading metadata.
- `AUTOMATION_REFACTOR.md` – notes on upcoming automation improvements.
