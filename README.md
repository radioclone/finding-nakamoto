# SBTC.Cool Turnkey × Stacks Automation Demo

A full-stack reference implementation that showcases **best practices for building modern Stacks crypto experiences with Turnkey embedded wallets**. The app unifies a user-controlled *Holding Wallet* with a delegated *Trading Wallet* on a single page, layers in automated DCA flows, and ships opinionated styling that mirrors production crypto dashboards.

## Why This Project Matters
- Demonstrates how to keep self-custodied keys client-side while delegating automation safely with Turnkey policies.
- Provides reusable UI/UX patterns for presenting multiple wallet types without confusing newcomers.
- Ships an automation pipeline blueprint (scheduling, execution logs, destinations) ready to connect to your own persistence layer.
- Highlights theming, caching, and API ergonomics that help new crypto devs build reliable dashboards fast.

## Feature Highlights
- 🔐 **Turnkey Wallet Kit integration** for passkey auth + holding-wallet custody.
- 🤖 **Delegated trading wallet provisioning** with policy-scoped access to swaps and transfers.
- 📈 **Automation console** for configuring STX⇄sBTC DCA schedules, including a test cadence (seconds-based) for rapid QA.
- 🧠 **Zustand-powered wallet cache** to avoid redundant Turnkey calls while keeping a manual refresh path.
- 💅 **Crypto-native design system** with theme toggle, gradients, and responsive cards (see `brandkit.md`).
- 🗂️ **Turnkey-friendly helpers** you can wire into any persistence layer for schedules, execution logs, and approved destinations.

## Quick Start for Developers

1. Install dependencies: `npm install`
2. Run the app: `npm run dev`
3. Open `http://localhost:3000` and explore the unified wallet dashboard.

---

## System Architecture Overview
- **Framework**: Next.js 15 App Router with React 19 (`src/app`).
- **Wallet UX**: `@turnkey/react-wallet-kit` for client interactions; `@turnkey/sdk-server` for privileged API calls.
- **State**: Zustand store (`src/store/useTurnkeyStore.ts`) caches wallet lists and loading flags.
- **Styling**: Tailwind CSS v4 via `globals.css`, dark-first palette, and `next-themes` for runtime switching.
- **Data**: Helper utilities in `src/lib/db` for syncing organizations and managing schedules when you add persistence.
- **Automation**: API routes under `src/app/api/turnkey/*` and `src/app/api/stacks/*` orchestrate swaps, transfers, and schedule simulation.

### Dual Wallet Model at a Glance
| Wallet | Custody | Capabilities | Key Component |
|--------|---------|--------------|---------------|
| **Holding Wallet** | 100% client-side (user seed export, manual signatures) | Create accounts, view balances, sign messages, transfer STX/sBTC, flag destinations for automation | `src/app/components/StacksWallet.tsx` |
| **Trading Wallet** | Server-provisioned Turnkey sub-org with delegated policies | Policy-guarded swaps, DCA, rebalancing, automated returns to holding destinations | `src/app/components/TradingWalletModule.tsx` |

```mermaid
graph LR
  User[User Browser] --> App[Unified Wallet Dashboard]
  App -->|Self-custody actions| Holding[Holding Wallet (Wallet Kit)]
  App -->|Configure automation| Trading[Trading Wallet Module]
  Trading -->|Provision sub-org & policy| TurnkeySDK[Turnkey Server SDK]
  Trading -->|Schedule swaps & returns| Automation[Automation APIs]
  Automation -->|Optional logs & history| Persistence[(Persistence Layer)]
  Automation -->|Swap & transfer calls| StacksAPIs[/Stacks & Turnkey APIs/]
  StacksAPIs -->|Execute STX⇄sBTC swaps| StacksNet[Stacks Testnet]
  StacksAPIs -->|Send proceeds back| Holding
```

---

## UI Modules & Developer Entry Points
- **`StacksWallet.tsx`** (`src/app/components/StacksWallet.tsx`)
  - Embeds the Turnkey Wallet Kit flows and surfaces all primary actions.
  - Uses the Zustand store to hydrate wallets once and expose a *Refresh* CTA.
  - Offers STX and sBTC transfers, message signing, and a destination toggle for automation returns.
  - Shows an auth-required overlay whenever the Turnkey session lapses.

- **`TradingWalletModule.tsx`** (`src/app/components/TradingWalletModule.tsx`)
  - Provisions trading sub-orgs via server routes (`/api/turnkey/grant-access`).
  - Aggregates delegated wallets + accounts, fetches balances, and exposes test transfer/swap buttons.
  - Hosts the DCA schedule builder with direction presets, amount chips, slippage guard, cron or test cadence (seconds-based), and destination sync.

- **`AutomationSchedules.tsx`** (`src/app/components/AutomationSchedules.tsx`)
  - Dedicated automation playground that chains three steps: STX→sBTC swap, sBTC→STX swap, and STX transfer back to the holding wallet.
  - Pulls flattened trading accounts from the DB API (`/api/db/trading-wallets`) and animates execution progress with per-step status cards.
  - Validates balances via Hiro API, supports manual balance refresh, and logs transaction links per step.
  - Great starting point for building production cron-driven execution UIs.

The main shell (`src/app/page.tsx`) surfaced these modules via themed tabs, a hero banner clarifying custody, and a header-level theme toggle plus session controls.

---

## Turnkey Wallet Integration (see `docs/turnkey_stacks.md`)
- **Provider setup**: `src/app/providers/TurnkeyProvider.tsx` wraps the app with `@turnkey/react-wallet-kit`, configuring `apiBaseUrl`, `organizationId`, and `authProxyConfigId` pulled from environment variables.
- **Core hook usage**: `StacksWallet.tsx` imports `useTurnkey` to access `handleLogin`, `createWallet`, `createWalletAccounts`, `refreshWallets`, `logout`, and signing utilities exposed by the Wallet Kit context.
- **Stacks-specific parameters**: Wallet accounts are provisioned with Turnkey’s Stacks-friendly settings (`CURVE_SECP256K1`, `PATH_FORMAT_BIP32`, `m/44'/5757'/0'/0/{index}`, `ADDRESS_FORMAT_COMPRESSED`) before deriving addresses via `@stacks/transactions`.
- **Signing flow**: `doSignRawPayload` forwards pre-hashed payloads to Turnkey’s `signRawPayload` endpoint using `HASH_FUNCTION_NO_OP` and then formats the returned `v`, `r`, `s` into Stacks-compatible signatures (see `formatSignatureToVRS`).
- **Transfers & swaps**: `handleTransferSTX` demonstrates the full loop—construct unsigned transactions with `makeUnsignedSTXTokenTransfer`, request signatures from Turnkey, attach them, and broadcast on Stacks testnet. The delegated swap routes in `src/app/api/stacks/*` reuse the same pattern on the server.
- **Security posture**: Holding-wallet keys never leave the client; trading-wallet actions are scoped by delegated policies created in `src/app/api/turnkey/grant-access/route.ts`, ensuring automation can only perform approved operations.

### Stacks Transaction Signing Deep Dive (from `docs/sign_tx_with_turnkey.md`)
- **Always keep V**: Turnkey’s `signRawPayload` already returns the correct recovery ID (`v`). Concatenate `v`, `r`, and `s` (each padded) to build the 130-hex-character signature expected by Stacks.
- **Signature anatomy**: Stacks signatures follow SIP-005: `V` (1 byte) + `R` (32 bytes) + `S` (32 bytes). Turnkey guarantees low-`S` values, so no extra normalization is needed.
- **Signing pipeline**: Build the unsigned transaction → compute `preSignSigHash` with `TransactionSigner` → call Turnkey → inject the formatted VRS back into `transaction.auth.spendingCondition.signature` → broadcast.
- **Recommended helper**:
  ```ts
  const signWithTurnkey = async (hash: string) => {
    const payload = hash.startsWith("0x") ? hash : `0x${hash}`;
    const signature = await httpClient.signRawPayload({
      organizationId,
      payload,
      signWith: publicKey,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });
    return `${signature.v.padStart(2, "0")}${signature.r.padStart(64, "0")}${signature.s.padStart(64, "0")}`;
  };
  ```
- **Common pitfalls**: Don’t strip `v`, don’t brute-force recovery IDs, and ensure the pre-sign hash is generated exactly as Stacks expects (`sigHashPreSign`).
- **Useful references**: SIP-005 transaction signing spec, Hiro’s “Dissecting a Transaction Signature,” and your local implementation in `StacksWallet.tsx` and `/api/stacks/send-stx`.

---

## Automation Pipeline
1. **Provisioning** – `/api/turnkey/grant-access` creates a Turnkey sub-org, attaches delegate policies, and seeds the first trading wallet.
2. **Database Sync** – `/api/cron/fetchSubOrgs` (run manually or via scheduler) mirrors organizations, wallets, and accounts into Postgres tables defined in `src/lib/db/schema.ts`.
3. **Schedule Creation** – Persist new DCA runs server-side via helpers such as `createScheduleFromForm` (`src/lib/db/helpers.ts`), capturing cadence, slippage caps, destinations, and optional `testIntervalSeconds` / `testExpirySeconds` for rapid QA.
4. **Execution** – `/api/turnkey/automation-step` orchestrates swaps and transfers by calling the stack of `/api/stacks/*` routes. The helper `simulate-dca` route shows how to wire schedules into cron jobs and execution logs.
5. **Return Path** – Holding-wallet destinations (stored in `holding_wallet_destinations`) gate which addresses automation can pay out, keeping user consent explicit.

Supporting APIs live under:
- `src/app/api/stacks/swap-stx-to-sbtc` and `swap-sbtc-to-stx`: delegated contract calls against your configured AMM.
- `src/app/api/stacks/send-stx`: delegated token transfer for returning funds.
- `src/app/api/turnkey/get-wallets`, `get-trading-orgs`: helper endpoints for debugging org trees.

---

## State, Theming, and UX Guidelines
- **Zustand Store** (`src/store/useTurnkeyStore.ts`): caches wallets + loading flags to eliminate redundant `refreshWallets()` calls. Use `setWallets`, `setLoading`, and `reset` when handling auth transitions.
- **Theme Toggle** (`src/app/page.tsx`): anchored in the header and powered by `next-themes`. All surfaces respect `resolvedTheme`, defaulting to dark mode if the system preference is unknown.
- **Brand Kit** (`brandkit.md`): outlines gradient tokens, typography, and component styling rules for light/dark parity. Reference it when extending the UI.
- **Responsive Patterns**: Cards adopt 24–32px padding on desktop, collapse to stacked surfaces on mobile, and keep sticky actions close to the viewport.

---

## Developer Workflow Tips
1. **Auth Guard**: `StacksWallet.tsx` displays a session overlay whenever `AuthState` is not `Authenticated`. Reuse the `handlePromptLogin` helper if you create new guarded flows.
2. **Manual Refresh**: wallet cache refresh should only be triggered after create-wallet/account actions succeed. Use the provided `handleRefreshWallets` to respect loading locks.
3. **API Testing**: call `/api/turnkey/get-trading-orgs` or `/api/turnkey/get-wallets` with `curl` + parent credentials during debugging; responses are JSON.
4. **Cron Simulation**: run `GET /api/cron/fetchSubOrgs` locally (no auth check in dev) if you want to mirror sub-org data into your persistence layer.
5. **Styling Consistency**: prefer the `var(--text-secondary)` style tokens or theme-resolved helper classes defined in `page.tsx` and `TradingWalletModule.tsx` to maintain parity across themes.

---

## Testing & Validation
- **TypeScript / Build**: `npm run build` (uses Turbopack) ensures type safety and Next.js compilation.
- **Automation Dry Runs**: Use the "Test cadence" option in the DCA form to trigger second-level runs and inspect the per-step UI before pointing at real cron jobs.
- **Balance Checks**: `AutomationSchedules.tsx` and trading module both hit Hiro APIs—ensure `NEXT_PUBLIC_HIRO_API_KEY*` values are set when rate limiting occurs.
- **Persistence Checks**: If you plug in a database, verify schedule rows and execution logs after test runs.

---

### Turnkey documentation map
- `TurnkeyProvider` setup and `handleLogin` flow reuse the Wallet Kit configuration described in the React getting-started guide (`src/app/providers/TurnkeyProvider.tsx`, `src/app/page.tsx`) — see [Turnkey React Wallet Kit Getting Started](https://docs.turnkey.com/sdks/react/getting-started).
- Sub-organization provisioning in `src/app/api/turnkey/grant-access/route.ts` follows the Create Sub-Organization activity contract and required root user payloads — see [Create Sub-Organization](https://docs.turnkey.com/api-reference/activities/create-sub-organization).
- Delegated policy creation strings (`consensus`, `effect`, `condition`) in the same route mirror the parameters documented under [Create Policy](https://docs.turnkey.com/api-reference/activities/create-policy).
- All delegated signing routes (`src/app/api/stacks/**/*.ts`) call `signRawPayload` with `PAYLOAD_ENCODING_HEXADECIMAL` and `HASH_FUNCTION_NO_OP` as required by [Approve Activity → signRawPayloadIntent](https://docs.turnkey.com/api-reference/activities/approve-activity#signrawpayloadintentv2).
- Stacks account parameters (`CURVE_SECP256K1`, `ADDRESS_FORMAT_COMPRESSED`) and signing strategy (`src/app/components/StacksWallet.tsx`, `src/app/api/stacks/*`) align with Turnkey’s [Stacks network guide](https://docs.turnkey.com/networks/stacks).

## Additional Resources
- `docs/turnkey_stacks.md` – Combined Turnkey + Stacks integration playbook.
- `plan.md` – Product/UX plan governing the unified wallet page.
- `AUTOMATION_REFACTOR.md` – Notes on extracting automation into its own module and follow-up roadmap.
- Official docs: [Turnkey React SDK](https://docs.turnkey.com/sdks/react) · [Turnkey Server SDK](https://docs.turnkey.com/sdks/server) · [Hiro Stacks.js](https://github.com/hirosystems/stacks.js).

## Environment Variables

Create a `.env.local` file and populate only the keys you need:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_TURNKEY_API_BASE_URL` | Base URL for the Turnkey Wallet Kit client (e.g. `https://api.turnkey.com`). |
| `NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID` | Parent Turnkey organization used by the client kit. |
| `NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID` | Auth proxy config ID from Turnkey dashboard. |
| `TURNKEY_BASE_URL` | Server-side Turnkey SDK base URL. |
| `TURNKEY_API_PUBLIC_KEY` / `TURNKEY_API_PRIVATE_KEY` | Parent API credentials for provisioning and cron tasks. |
| `TURNKEY_DELEGATED_API_PUBLIC_KEY` / `TURNKEY_DELEGATED_API_PRIVATE_KEY` | Delegated operator credentials for trading wallet automations. |
| `TURNKEY_DELEGATED_USER_NAME`, `TURNKEY_DELEGATED_API_KEY_NAME` | Optional naming metadata for generated sub-org users. |
| `DELEGATE_USER_ID` | Optional fixed delegate user ID if you pre-created one. |
| `SIMPLE_AMM_CONTRACT_ADDRESS`, `SIMPLE_AMM_CONTRACT_NAME` | Target AMM contract for swaps (`foo.bar` format). |
| `NEXT_PUBLIC_APP_URL` | Public URL used by server routes to call themselves (defaults to `http://localhost:3000`). |
| `NEXT_PUBLIC_STACKS_RECIPIENT_ADDRESS` | Default holding-wallet transfer recipient (testnet). |
| `NEXT_PUBLIC_HIRO_API_KEY1..3` | Optional rotation keys for Hiro API rate limiting. |
| `CRON_SECRET` | Bearer token required by `/api/cron/*` in production. |

> Need a refresher on Turnkey parameters? See `docs/turnkey_stacks.md` for call-by-call details.

Feel free to extend the automation runtime, add new policy templates, or connect to mainnet once you are comfortable with the delegated custody flow.
