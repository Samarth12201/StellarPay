# StellarPay Level 3 Orange Belt Walkthrough

We have successfully refactored and upgraded StellarPay with advanced on-chain features and contract logic to meet all the **Level 3 Orange Belt** submission criteria.

Here is a summary of the core features and architectural improvements:

## 1. Deployed Soroban Contracts
- **Group Expense & Pools Contract:** `CCXGCUR7WRG75FT3M4DW763MMQW6ZHDFRPHVX6L5W67MWY3ED5YVBELB`
- **Payment Request Registry:** `CBJJMXJVIXE6ZAK7WBOFX46ATAEJEXRJUNETL5RXR7J6LF35GMN3G742`

---

## 2. USDC Stablecoin Settlements (Inter-Contract Calls)
- **Asset Selection:** Added a currency dropdown (XLM / USDC) to the expense splitting forms.
- **On-Chain Token Settle:** When a user settles a group split in USDC, the app builds a transaction calling `settle_expense_with_token` on our deployed `group_expense` contract.
- **Inter-Contract Call:** The contract uses the `token::Client` to perform an on-chain cross-contract call to the official Testnet USDC token contract (`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`) to transfer funds atomically from the payer to the receiver.

---

## 3. Voluntary Crowdfunded Escrow Pools (Gift / Event Jars)
- **Smart Escrow Custody:** Users can create voluntary group pools (e.g., *"Group Gift Fund"*).
- **On-Chain Escrow Storage:** Contributions are transferred from members' wallets directly to the smart contract address, which holds them in custody.
- **Visual Progress Bar:** The UI features a glassmorphic dashboard with dynamic progress indicators showing percentage raised.
- **Secure Release:** Only the creator of the pool can trigger the `withdraw_pool` function on-chain, which releases the escrowed funds to their wallet and closes the pool.
- **Trustline Helper:** Added a 1-click **"Add USDC Trustline"** button that invokes a Horizon `changeTrust` transaction to instantly establish USDC trustlines for new users.

---

## 4. Real-Time Syncing & Notifications
- **Zustand + Supabase Sync:** All group creations, expense splits, pools, and request statuses write to local storage and sync to the cloud database.
- **Supabase Real-Time Subscriptions:** Listens to `INSERT` events to alert users with a premium dark-indigo toast notification whenever another member requests funds.
- **Ledger Sequence Underflow Fix:** Refactored `useContractEvents.ts` to fetch at most 100 ledgers back if state is empty, preventing Testnet RPC nodes from failing.

---

## 5. UI/UX & Responsive Layouts
- **Send & Contract Tab Merger:** Unified all on-chain payment types into one clean, collapsible form.
- **Stellar Address Form Checks:** Enforces that every member address is a valid Stellar key (56 characters, starts with `G`), and auto-fills "Me" with the connected Freighter wallet key.

---

## 6. Verification & Test Output
- **Rust Contract Tests:** Compiles and passes all cargo tests:
  ```bash
  $ cargo test
  running 3 tests
  test test::test_create_pool_success ... ok
  test test::test_create_group_success ... ok
  test test::test_add_expense_and_retrieve ... ok
  ```
- **TypeScript & Build Checks:** `npm run typecheck` and `npm run build` compile successfully with 0 errors.
- **Vitest Unit Tests:** Fully passes 17 frontend unit tests covering calculation engines, Zustand store selectors, and component rendering.
