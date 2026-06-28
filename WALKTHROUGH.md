# StellarPay Level 3 Orange Belt Walkthrough

We have successfully refactored and polished StellarPay to meet all the **Level 3 Orange Belt** submission criteria, resolving key UX and syncing bugs.

Here is a summary of the core features and architectural improvements we made:

## 1. Merged Send & Contract Tabs
- **Simplified Navigation:** Removed the separate "Contract" page. We unified all on-chain payment options into a single upgraded **"Send"** tab.
- **Two Modes:**
  - **Simple Send:** Standard direct XLM payment on Stellar Testnet.
  - **Pay On-Chain Request:** Input a Soroban Smart Contract Request ID, load details, and settle atomically (combining native transfer + contract `mark_paid` call in a single transaction).
- **Collapsible Contract Info:** Display the deployed contract addresses directly at the bottom of the on-chain request form for evaluation transparency.

## 2. Cloud Synchronization & Syncing Fixes
- **Double-Write Mutations:** Modified `groupStore` and `requestStore` actions to immediately upsert data to Supabase (e.g. `createGroup`, `addExpense`, `addRequest`), ensuring other members see updates immediately.
- **Inbox Address Routing:** Corrected `getIncoming`, `getOutgoing`, and `getPendingCount` selectors to properly filter queries based on the connected wallet's public key rather than displaying all requests globally.
- **State Keys Upgrade:** Migrated local storage persist keys to `stellarpay-groups-v4` and `stellarpay-requests-v4` to purge old schemas.

## 3. Real-Time Toast Notifications
- **INSERT-only Filter:** Created a new hook (`useRealtimeRequests`) that subscribes to Supabase updates on the `INSERT` event only.
- **Debounced Load Alert:** Suppresses notifications on initial page load via a 3-second ref state timer, ensuring alerts only trigger for actual new requests.
- **Dark Indigo Toast:** Displays a premium styled toast alert whenever another user sends a request to your address.

## 4. Ledger Event Feed Polling
- **Sequence Underflow Fix:** Modified `startLedger` calculation in `useContractEvents.ts` to poll back a maximum of 100 ledgers (instead of 200) when historical state is empty. This prevents index lookup errors on Testnet RPC servers.

## 5. Group Member Address Validation
- **Stellar Address Check:** In `CreateGroup.tsx`, form submission is blocked until every member's address starts with `G` and has a length of exactly 56 characters.
- **Connected Wallet Auto-Fill:** The first member row ("Me") dynamically auto-fills with the connected wallet address when it becomes available.

## 6. Verification & Test Results
- **Type Safety:** Compilation checks (`npm run typecheck`) succeed with 0 type errors.
- **Vitest Unit Tests:** Increased the test suite to **17 passing unit tests** covering:
  - Optimal settlement net-balance splits
  - `useGroupSettlement` Zustand selector hooks
  - `SettlementView` list and action rendering
- **Production Bundling:** Verified that `npm run build` succeeds and produces the optimized production client bundles.
