# Turnkey × Stacks Integration Guide

## Overview
This project combines Turnkey’s embedded wallet tooling with Stacks blockchain workflows to power two coordinated wallet experiences:
- A **Holding Wallet** that lives entirely client-side via `@turnkey/react-wallet-kit`
- A **Trading Wallet** provisioned server-side with delegated policies for automated actions such as DCA swaps and scheduled returns

This guide combines the highlights from the earlier `docs/turnkey.md` and `docs/sign_tx_with_turnkey.md` references.

---

## 1. Wallet Kit & App Wiring
- Wrap the application with `TurnkeyProvider` (`src/app/providers/TurnkeyProvider.tsx`), passing `apiBaseUrl`, `organizationId`, and `authProxyConfigId` from environment variables.
- Consume `useTurnkey()` inside components (e.g., `StacksWallet.tsx`) to access `handleLogin`, `createWallet`, `createWalletAccounts`, `refreshWallets`, `logout`, and the authenticated `httpClient`.
- Authenticate users with passkeys or OAuth via the Wallet Kit modal; treat `authState === AuthState.Authenticated` as the gate for showing restricted UI.

### Stacks-Compatible Wallet Creation
```ts
const STACKS_ACCOUNT_PARAMS = {
  curve: "CURVE_SECP256K1",
  pathFormat: "PATH_FORMAT_BIP32",
  path: `m/44'/5757'/0'/0/${accountIndex}`,
  addressFormat: "ADDRESS_FORMAT_COMPRESSED",
};
```
- `handleCreateWallet` creates a Turnkey wallet plus the first account using the parameters above.
- `handleCreateAccount` appends additional accounts, incrementing the final derivation index.
- Derived addresses rely on `getAddressFromPublicKey(publicKey, "testnet" | "mainnet")` from `@stacks/transactions`.

### UI Highlights
- Authentication overlays remind users to log back in if `authState` drops.
- Wallet lists use expandable panels, skeleton loaders, and destination toggles to mark trusted holding addresses for automation.
- Toast notifications summarize success/failure of transfers and signing operations.

---

## 2. Signing Stacks Payloads with Turnkey
> **Key insight:** Turnkey's `signRawPayload` already returns the correct recovery ID (`v`). Use the `v`, `r`, and `s` values directly—do not recompute recovery IDs.

### End-to-End Flow
1. Build an unsigned transaction (`makeUnsignedSTXTokenTransfer` or `makeUnsignedContractCall`).
2. Create a `TransactionSigner` and compute `preSignSigHash` via `sigHashPreSign`.
3. Call `signRawPayload` on Turnkey's `httpClient` (browser) or SDK client (server) with `PAYLOAD_ENCODING_HEXADECIMAL` and `HASH_FUNCTION_NO_OP`.
4. Concatenate `v`, `r`, and `s` (pad `r` and `s` to 64 chars) to form the 130-hex-character signature.
5. Apply the signature with `createMessageSignature` and broadcast.

### Helper Pattern (Browser - Holding Wallet)
```ts
// In React component with useTurnkey()
const { httpClient } = useTurnkey();

const signWithTurnkey = async (hash: string) => {
  const payload = hash.startsWith("0x") ? hash : `0x${hash}`;
  const signature = await httpClient.signRawPayload({
    signWith: publicKey,
    payload,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_NO_OP",
  });

  return `${signature.v}${signature.r.padStart(64, "0")}${signature.s.padStart(64, "0")}`;
};
```

### Helper Pattern (Server - Trading Wallet)
```ts
// Server-side with delegated credentials
const delegatedClient = new Turnkey({
  apiBaseUrl: BASE_URL,
  apiPrivateKey: DELEGATED_PRIVATE_KEY,
  apiPublicKey: DELEGATED_PUBLIC_KEY,
  defaultOrganizationId: organizationId,
}).apiClient();

const signWithTurnkey = async (hash: string) => {
  const payload = hash.startsWith("0x") ? hash : `0x${hash}`;
  const signature = await delegatedClient.signRawPayload({
    organizationId,
    signWith: publicKey,
    payload,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_NO_OP",
  });

  return `${signature.v}${signature.r.padStart(64, "0")}${signature.s.padStart(64, "0")}`;
};
```

### Common Pitfalls
- ✅ Always keep Turnkey’s `v`; it encodes the correct recovery ID for Stacks.
- ✅ Ensure `r` and `s` are left-padded to 64 hex characters.
- ✅ Use `sigHashPreSign` to obtain the hash that Stacks expects.
- ❌ Do not try every recovery ID manually.
- ❌ Do not strip `v` and resend only `r`/`s`.

References: [SIP-005](https://github.com/stacksgov/sips/blob/main/sips/sip-005/sip-005-blocks-and-transactions.md), [Hiro blog on signatures](https://www.hiro.so/blog/dissecting-a-transaction-signature-on-stacks).

---

## 3. Trading Wallet Provisioning & Policies
- `src/app/api/turnkey/grant-access/route.ts` creates a sub-organization per user, seeds it with root users (delegate + end user), and sets up delegated policies using Turnkey's server SDK.
- Policies use expressions like `approvers.any(user, user.id == '${delegatedUserId}')` and optional conditions to scope automation (e.g., swap directions, destination constraints).
- The trading module (`TradingWalletModule.tsx`) fetches organizations, wallets, and accounts from Turnkey, caches them, and renders per-account controls for swaps, transfers, and automation schedules.

### Data Fetching: Offchain vs. Direct Turnkey API
The application provides two approaches for querying trading organizations:

**Offchain (Cached) - `/api/cron/fetchSubOrgs`**
- Fetches sub-organizations from Turnkey and stores them in the database
- Best for: dashboards, analytics, frequent queries, performance-sensitive operations
- Pros: Fast queries, reduces Turnkey API load, enables complex SQL queries
- Cons: May have slight delay (depends on cron frequency)
- Triggered automatically after sub-org creation in `grant-access/route.ts`

**Direct Turnkey API - `/api/turnkey/get-trading-orgs`**
- Queries Turnkey API directly in real-time
- Best for: admin operations, real-time accuracy requirements, one-time queries
- Pros: Always up-to-date, no caching layer
- Cons: Slower, hits Turnkey API on every request

Choose based on your use case:
- Use offchain for user-facing features and frequent reads
- Use direct API for admin tools and when absolute real-time data is critical

---

## 4. Automation Routines
- Client-side scheduler UI collects direction, amount, cadence (daily/weekly/custom/test), slippage, and destination preferences.
- Server routes under `src/app/api/stacks/` execute delegated swaps and transfers by:
  1. Building Stacks contract calls or token transfers
  2. Requesting signatures from Turnkey’s delegated API credentials
  3. Broadcasting to Stacks testnet
- `/api/turnkey/automation-step` orchestrates multi-step flows (swap STX→sBTC → optional swap back → transfer to holding wallet) while reporting progress and transaction IDs to the UI.

---

## 5. Putting It Together
- Holding Wallet: fully client-controlled, uses Wallet Kit to manage accounts and sign only with explicit user actions.
- Trading Wallet: server-provisioned with tight delegated policies, enabling automated DCA or rebalancing flows without exposing broad custody.
- Optional persistence (e.g., Drizzle + Postgres) records organizations, wallets, schedules, and execution logs for analytics or cron-driven operations.

With these building blocks, you can extend the demo to mainnet, add new automation strategies, or plug in alternative storage and notification systems.
