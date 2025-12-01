# Finding Nakamoto – Smart Wallet Core (Turnkey x Stacks)

This repo contains the core smart-wallet infrastructure for the **Finding Nakamoto** project in the Stacks DeGrants program (issue #59).

Its job is to prototype how self-custodied and policy-guarded wallets on Stacks can be managed through Turnkey and exposed to a UI.  
This is **foundation work** that will support Milestone 1, 2, and 3 frontends later.

Grant issue: https://github.com/stacksgov/decentralized-grants/issues/59

---

## What’s implemented right now

- Next.js 15 + React 19 app with a multi-tab dashboard (Holding / Trading / Automation).
- Turnkey integration for:
  - authenticating users,
  - creating wallets and accounts,
  - signing Stacks transactions via Turnkey (client or delegated server keys).
- API routes to:
  - create per-user Turnkey sub-orgs and trading wallets,
  - sync org / wallet / account metadata into Postgres,
  - build and sign step-by-step automation jobs (e.g. swap, unwind, transfer).
- Drizzle ORM schema for trading organizations, wallets, and accounts, keyed by Turnkey IDs and enriched with Stacks addresses.

There is **no SIP-009 mint or narrative / game UI in this repo yet**.  
This is strictly the under-the-hood wallet + automation layer.

---

## Architecture (high level)

- **App**  
  - Next.js App Router dashboard rendered on the client (`src/app/page.tsx`).  
  - Tabs for Holding, Trading, and Automation, all using a shared `useTurnkey()` hook.

- **Providers**  
  - `TurnkeyProvider` wraps the app with Turnkey’s React wallet kit and reads all keys/IDs from environment variables.  
  - Theme provider keeps the UI consistent (dark mode etc.).

- **Server routes**  
  - `/api/turnkey/grant-access` – creates a Turnkey sub-org, seeds a trading wallet, and sets up delegate access.  
  - `/api/cron/fetchSubOrgs` – caches org / wallet / account metadata into Postgres.  
  - `/api/turnkey/automation-step` – builds Stacks transactions, has Turnkey sign them, and broadcasts via Hiro.

- **Persistence**  
  - Drizzle ORM + Postgres for trading orgs, wallets, and accounts (`src/lib/db/schema.ts`).  
  - Zustand store for lightweight client-side cache so the UI doesn’t refetch Turnkey on every render.

---

## Status and relation to milestones

- This repo is **foundation / core dev** for Finding Nakamoto.  
- It supports pieces of **Milestone 1, 2, and 3** by handling wallets and automation logic in one place.
- The SIP-009 NFT mint flow and narrative / learning UI will be built on top of this in separate frontend work.

Planned next steps:
- Keep consolidating core wallet / automation logic here.
- Expose a minimal API surface that a Milestone-1 browser demo can call (connect, show balances, trigger mint once SIP-009 is ready).

---

**Status update – core dev consolidation**

I’ve been working in parallel on the different pieces of Milestones 1, 2, and 3 (smart-wallet core, automation logic, audio/VO, and early UI tests). I’ve now created a main repo to consolidate the foundation and under-the-hood work:

- Smart wallet core repo: https://github.com/radioclone/finding-nakamoto

This repo is currently focused on the Turnkey-based wallet + automation backend (Next.js app, API routes, Drizzle/Postgres). There is no SIP-009 mint or narrative walkthrough in this repo yet; that will be wired in from the UI side next.

Given the amount of core work I’m consolidating, I’d like to take an additional week (until around **Dec 8–10**) to keep integrating this foundation and then surface a clean Milestone 1 browser demo and recording.
