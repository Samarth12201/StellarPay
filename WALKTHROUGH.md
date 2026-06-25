# StellarPay — Smart Bill Splitting & QR Payments on Stellar

Welcome to the **StellarPay Walkthrough**! This document provides a comprehensive breakdown of the application architecture, database design, smart contract integrations, core features, and the CI/CD pipeline setup built for the Stellar developer certification.

---

## 🚀 Core Features

StellarPay combines native Stellar payments, Soroban smart contract logic, and cloud database state sync into a premium, responsive web application.

1. **Multi-Wallet Integration**: Built using `@creit.tech/stellar-wallets-kit`, allowing users to connect using Freighter, Albedo, xBull, Lobstr, or Hana wallets.
2. **Direct XLM Payments**: Native transfers on the Stellar Testnet with support for 28-character transaction memos and direct links to Stellar Expert explorer.
3. **Smart Bill Splitting**: Create expense groups, add members, log items, and automatically split bills. Supports:
   - **Equal Split**: Even division among all group members.
   - **Custom Split**: Specific manually allocated XLM amounts per member.
4. **Optimal Settlement Engine**: A greedy net-balance algorithm implemented on the frontend that calculates the minimum number of transactions needed to resolve all debts in a group.
5. **Real-Time Payment Notifications**: Background sync alerts users with a modern dark-indigo toast notification (`react-hot-toast`) the moment a new pending payment request is addressed to their wallet.
6. **QR Code Generator & `/pay` Pages**: Generates shareable Web Share links or QR codes. Anyone opening the link sees a beautiful standalone pay page with pre-filled amount, memo, and destination.

---

## 🛠️ Soroban Smart Contract Integration

StellarPay utilizes two custom-written Rust Soroban smart contracts deployed to the Stellar Testnet:

### 1. Payment Requests Contract (`CBJJMXJVIXE6ZAK7WBOFX46ATAEJEXRJUNETL5RXR7J6LF35GMN3G742`)
Manages standalone on-chain requests and tracks their status.
* `create_request(from: Address, to: Address, amount: i128, memo: String) -> u64`: Creditor registers a pending request on-chain.
* `mark_paid(caller: Address, request_id: u64)`: designated debtor marks the request status as `Paid`.
* `reject_request(caller: Address, request_id: u64)`: designated debtor declines the request.
* `get_request(request_id: u64) -> Option<PaymentRequest>`: reads request data.
* `get_count() -> u64`: retrieves total request count.

### 2. Group Expense Contract (`CBHZ2M42TVVICJM3FDUA6QXHJEEVLYQRN4BM4DAAVD7HJLJBLVUK6NNF`)
Records expenses, groups, and settlements on-chain.
* `create_group(...) -> u64`: logs a new bill-splitting group.
* `add_expense(...) -> u64`: registers a group expense with split details.
* `settle_expense(...)`: marks an expense as settled on-chain.

### ⚡ Atomic Multi-Operation Transactions
In the **Send XLM** tab, users can load any on-chain request ID from the contract. When paying, the app compiles a single atomic Stellar transaction containing:
1. `Operation.payment`: Transfers the XLM to the creditor.
2. `contract.call('mark_paid')`: Invocates the Soroban contract to update the status.
If either operation fails, the entire transaction rolls back, preventing lost funds or incorrect statuses.

---

## 🗄️ Database Architecture (Supabase)

To enable cross-device synchronization (e.g. sharing expenses across different browser profiles/laptops), StellarPay integrates a cloud-backed Supabase database.

### Database Tables
```sql
-- 1. Create groups table
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create group_members table
CREATE TABLE group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  avatarColor TEXT NOT NULL
);

-- 3. Create expenses table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  totalAmount DOUBLE PRECISION NOT NULL,
  paidBy TEXT REFERENCES group_members(id) ON DELETE CASCADE,
  splitAmong TEXT[] NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  settled BOOLEAN DEFAULT FALSE
);

-- 4. Create payment_requests table
CREATE TABLE payment_requests (
  id TEXT PRIMARY KEY,
  groupId TEXT REFERENCES groups(id) ON DELETE CASCADE,
  groupName TEXT,
  fromAddress TEXT NOT NULL,
  toAddress TEXT NOT NULL,
  fromName TEXT NOT NULL,
  amount TEXT NOT NULL,
  memo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  txHash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Zustand Persistence & Concurrency Fixes
* **Store Versioning**: Updated local storage keys to `v4` (`stellarpay-groups-v4` and `stellarpay-requests-v4`) to clear stale caches across clients.
* **Sync Locks**: Added local file-scope locking boolean variables (`isSyncingGroups` and `isSyncingRequests`) to prevent duplicate overlapping background sync executions.
* **Upsert Mitigation**: Changed background auto-uploads from `.insert()` to `.upsert()` to prevent `409 (Conflict)` database primary key errors when multiple browser windows sync concurrently.

---

## 🧪 Testing Suite & CI/CD Pipeline

StellarPay enforces high software quality using automated checks and unit testing:

### 1. CI/CD GitHub Workflows
* **Continuous Integration (`.github/workflows/ci.yml`)**: Runs on pushes and pull requests to `main`/`master` branches. Sets up Node.js, installs dependencies, typechecks the codebase, and runs all frontend tests.
* **Continuous Deployment (`.github/workflows/deploy.yml`)**: Automatically triggers a production build and deploys changes to **Vercel** on successful main commits.

### 2. Frontend Unit Tests (`src/__tests__/utils.test.ts`)
We run a comprehensive suite of Vitest unit tests:
* `truncateAddress`: Ensures public keys truncate correctly (e.g. `GAJSRG...VYUBIB`).
* `formatXlm`: Tests balance formatting under normal values and fallback values.
* `isValidStellarAddress`: Tests key structure validation (Ed25519 CRC16 checksum validation).

### 3. Rust Smart Contract Tests
Inside the `group_expense` contract, we have verified tests:
* `test_create_group_success`
* `test_add_expense_and_retrieve`
* `test_settle_expense`
* `test_create_group_too_few_members` (asserts panics)
* `test_add_expense_zero_amount` (asserts panics)
