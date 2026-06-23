# StellarPay — Level 2 Yellow Belt Dev Plan
## Stellar Journey to Mastery | Builds on Level 1 (White Belt ✅)

---

## What's New in Level 2

| Feature | Level 1 | Level 2 |
|---|---|---|
| Wallet | Freighter only | StellarWalletsKit (Freighter + Lobstr + xBull + WalletConnect) |
| Contracts | None | Soroban smart contract deployed on Testnet |
| Contract calls | None | Frontend calls contract read/write functions |
| Error handling | Basic | 3 typed error classes (WalletError, ContractError, NetworkError) |
| Tx status | Success/fail | Pending → Confirming → Success/Failed with live updates |
| Events | None | Contract event streaming + activity feed |
| Commits | — | Minimum 2 meaningful commits required |

---

## The Upgrade: What We're Adding to StellarPay

We extend the existing StellarPay app with:

1. **StellarWalletsKit** — drop-in multi-wallet selector modal replacing the Freighter-only button
2. **PaymentRequest Soroban contract** — stores on-chain payment requests with status tracking
3. **Real-time event feed** — polls contract events and shows live activity
4. **Transaction status tracker** — pending → confirming → success/failed state machine
5. **3 error types** — wallet, contract, and network errors with user-friendly messages

---

## Tech Stack (additions to Level 1)

| Tool | Purpose |
|---|---|
| `@creit-tech/stellar-wallets-kit` | Multi-wallet modal (Freighter, Lobstr, xBull, WalletConnect) |
| `@stellar/stellar-sdk` (Soroban client) | Contract invocation, event streaming |
| Rust + Soroban SDK | Smart contract language |
| `stellar-cli` | Build, deploy, and invoke contract on Testnet |
| `zustand` (already installed) | tx status store, event feed store |

---

## Updated Folder Structure

```
stellarpay/
├── contracts/
│   └── payment_requests/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs            ← Soroban smart contract
├── src/
│   ├── components/
│   │   ├── wallet/
│   │   │   ├── WalletModal.tsx   ← NEW: StellarWalletsKit modal trigger
│   │   │   ├── WalletConnect.tsx ← REPLACE: now uses kit
│   │   │   └── WalletInfo.tsx    ← UPDATE: shows wallet type
│   │   ├── contract/
│   │   │   ├── ContractRequests.tsx  ← NEW: on-chain requests panel
│   │   │   └── ContractStatus.tsx   ← NEW: contract address + info
│   │   ├── tx/
│   │   │   └── TxStatusBar.tsx   ← NEW: pending/confirming/done tracker
│   │   └── events/
│   │       └── EventFeed.tsx     ← NEW: live contract event feed
│   ├── hooks/
│   │   ├── useWallet.ts          ← UPDATE: StellarWalletsKit
│   │   ├── useContract.ts        ← NEW: contract read/write calls
│   │   ├── useContractEvents.ts  ← NEW: event polling
│   │   └── useTxStatus.ts        ← NEW: tx state machine
│   ├── errors/
│   │   ├── WalletError.ts        ← NEW
│   │   ├── ContractError.ts      ← NEW
│   │   └── NetworkError.ts       ← NEW
│   ├── store/
│   │   ├── walletStore.ts        ← UPDATE: add walletType field
│   │   ├── txStore.ts            ← NEW: transaction status store
│   │   └── eventStore.ts         ← NEW: contract events store
│   ├── constants/
│   │   └── contract.ts           ← NEW: contract address + network
│   └── pages/
│       └── Dashboard.tsx         ← UPDATE: add Contract + Events tabs
```

---

## Part 1 — The Soroban Smart Contract

### File: `contracts/payment_requests/Cargo.toml`

```toml
[package]
name = "payment-requests"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = { version = "21.0.0", features = ["alloc"] }

[dev-dependencies]
soroban-sdk = { version = "21.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true
```

### File: `contracts/payment_requests/src/lib.rs`

```rust
#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contractevent,
    Address, Env, String, Vec, symbol_short,
};

// ─── Data types ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum RequestStatus {
    Pending,
    Paid,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
pub struct PaymentRequest {
    pub id: u64,
    pub from: Address,    // who is owed
    pub to: Address,      // who must pay
    pub amount: i128,     // in stroops (1 XLM = 10_000_000)
    pub memo: String,
    pub status: RequestStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    RequestCount,
    Request(u64),
    UserRequests(Address),  // requests where user is the "to"
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct PaymentRequestContract;

#[contractimpl]
impl PaymentRequestContract {

    /// Create a new payment request (creditor calls this)
    pub fn create_request(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        memo: String,
    ) -> u64 {
        from.require_auth();

        // Validate amount > 0
        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Auto-increment ID
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RequestCount)
            .unwrap_or(0u64)
            + 1;

        let request = PaymentRequest {
            id,
            from: from.clone(),
            to: to.clone(),
            amount,
            memo: memo.clone(),
            status: RequestStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        // Store the request
        env.storage()
            .persistent()
            .set(&DataKey::Request(id), &request);

        // Update count
        env.storage()
            .instance()
            .set(&DataKey::RequestCount, &id);

        // Emit event
        env.events().publish(
            (symbol_short!("request"), symbol_short!("created")),
            (id, from, to, amount),
        );

        id
    }

    /// Mark a request as paid (debtor calls this after sending XLM)
    pub fn mark_paid(env: Env, caller: Address, request_id: u64) {
        caller.require_auth();

        let mut request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        // Only the designated payer can mark as paid
        if request.to != caller {
            panic!("only the designated payer can mark as paid");
        }

        request.status = RequestStatus::Paid;
        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);

        // Emit event
        env.events().publish(
            (symbol_short!("request"), symbol_short!("paid")),
            (request_id, caller, request.amount),
        );
    }

    /// Reject a request
    pub fn reject_request(env: Env, caller: Address, request_id: u64) {
        caller.require_auth();

        let mut request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        if request.to != caller {
            panic!("only the designated payer can reject");
        }

        request.status = RequestStatus::Rejected;
        env.storage()
            .persistent()
            .set(&DataKey::Request(request_id), &request);

        env.events().publish(
            (symbol_short!("request"), symbol_short!("rejected")),
            (request_id, caller),
        );
    }

    /// Read a single request by ID
    pub fn get_request(env: Env, request_id: u64) -> Option<PaymentRequest> {
        env.storage()
            .persistent()
            .get(&DataKey::Request(request_id))
    }

    /// Get total request count
    pub fn get_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RequestCount)
            .unwrap_or(0)
    }
}
```

---

## Part 2 — Deploy the Contract

### Install Stellar CLI

```bash
# macOS
brew install stellar-cli

# Or via cargo
cargo install --locked stellar-cli --features opt
```

### Setup Testnet Identity

```bash
# Generate a new identity (or use existing)
stellar keys generate --global alice --network testnet

# Fund with Friendbot
stellar keys fund alice --network testnet

# Check balance
stellar keys show alice --network testnet
```

### Build the Contract

```bash
cd contracts/payment_requests

# Build WASM
stellar contract build

# Output: target/wasm32-unknown-unknown/release/payment_requests.wasm
```

### Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_requests.wasm \
  --source alice \
  --network testnet

# OUTPUT: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# ↑ Save this as your CONTRACT_ADDRESS
```

### Test Contract Calls (CLI)

```bash
# Create a payment request
stellar contract invoke \
  --id YOUR_CONTRACT_ADDRESS \
  --source alice \
  --network testnet \
  -- create_request \
  --from ALICE_PUBLIC_KEY \
  --to BOB_PUBLIC_KEY \
  --amount 100000000 \
  --memo "Dinner split"

# Read request count
stellar contract invoke \
  --id YOUR_CONTRACT_ADDRESS \
  --source alice \
  --network testnet \
  -- get_count

# Get a request by ID
stellar contract invoke \
  --id YOUR_CONTRACT_ADDRESS \
  --source alice \
  --network testnet \
  -- get_request \
  --request_id 1
```

Save the deploy transaction hash — it goes in your README.

---

## Part 3 — Error Classes

### File: `src/errors/WalletError.ts`

```typescript
export class WalletError extends Error {
  constructor(
    public code:
      | 'NOT_INSTALLED'
      | 'USER_REJECTED'
      | 'NOT_CONNECTED'
      | 'WRONG_NETWORK'
      | 'LOCKED',
    message: string
  ) {
    super(message);
    this.name = 'WalletError';
  }

  static fromCode(code: WalletError['code']): WalletError {
    const messages: Record<WalletError['code'], string> = {
      NOT_INSTALLED: 'Wallet extension not found. Please install Freighter, Lobstr, or xBull.',
      USER_REJECTED: 'You rejected the wallet request. Please try again.',
      NOT_CONNECTED: 'No wallet connected. Please connect first.',
      WRONG_NETWORK: 'Wrong network. Please switch your wallet to Stellar Testnet.',
      LOCKED: 'Wallet is locked. Please unlock it and try again.',
    };
    return new WalletError(code, messages[code]);
  }

  get userMessage(): string {
    return this.message;
  }

  get isFatal(): boolean {
    return this.code === 'NOT_INSTALLED';
  }
}
```

### File: `src/errors/ContractError.ts`

```typescript
export class ContractError extends Error {
  constructor(
    public code:
      | 'INVOKE_FAILED'
      | 'SIMULATION_FAILED'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'INVALID_ARGS'
      | 'CONTRACT_PANIC',
    message: string,
    public raw?: unknown
  ) {
    super(message);
    this.name = 'ContractError';
  }

  static fromStellarError(err: unknown): ContractError {
    const msg = String(err);

    if (msg.includes('not found')) {
      return new ContractError('NOT_FOUND', 'Contract or request not found.', err);
    }
    if (msg.includes('unauthorized') || msg.includes('require_auth')) {
      return new ContractError('UNAUTHORIZED', 'You are not authorized to perform this action.', err);
    }
    if (msg.includes('simulation') || msg.includes('preflight')) {
      return new ContractError('SIMULATION_FAILED', 'Contract simulation failed. Check your inputs.', err);
    }
    if (msg.includes('panic')) {
      return new ContractError('CONTRACT_PANIC', 'Contract rejected this operation: ' + msg, err);
    }
    return new ContractError('INVOKE_FAILED', 'Contract call failed. Please try again.', err);
  }

  get userMessage(): string {
    return this.message;
  }
}
```

### File: `src/errors/NetworkError.ts`

```typescript
export class NetworkError extends Error {
  constructor(
    public code:
      | 'HORIZON_UNAVAILABLE'
      | 'TIMEOUT'
      | 'INSUFFICIENT_FEE'
      | 'RATE_LIMITED'
      | 'TX_FAILED',
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }

  static fromHorizonError(err: unknown): NetworkError {
    const response = (err as any)?.response;
    const status = response?.status;
    const resultCode = response?.data?.extras?.result_codes?.transaction;

    if (status === 429) {
      return new NetworkError('RATE_LIMITED', 'Too many requests. Please wait a moment.', 429);
    }
    if (resultCode === 'tx_insufficient_fee') {
      return new NetworkError('INSUFFICIENT_FEE', 'Transaction fee too low. Please try again.', status);
    }
    if (!navigator.onLine) {
      return new NetworkError('HORIZON_UNAVAILABLE', 'No internet connection. Check your network.');
    }
    return new NetworkError('TX_FAILED', 'Transaction failed: ' + (resultCode ?? 'unknown error'), status);
  }

  get userMessage(): string {
    return this.message;
  }

  get isRetryable(): boolean {
    return this.code === 'TIMEOUT' || this.code === 'RATE_LIMITED';
  }
}
```

---

## Part 4 — Multi-Wallet with StellarWalletsKit

### Install

```bash
npm install @creit-tech/stellar-wallets-kit
```

### File: `src/constants/contract.ts`

```typescript
export const CONTRACT_ADDRESS = 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
// Replace with your actual deployed contract address

export const NETWORK = {
  name: 'TESTNET' as const,
  passphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
};
```

### File: `src/hooks/useWallet.ts` (full replacement)

```typescript
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  LOBSTR_ID,
  XBULL_ID,
  allowAllModules,
} from '@creit-tech/stellar-wallets-kit';
import { useWalletStore } from '../store/walletStore';
import { WalletError } from '../errors/WalletError';

let kit: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

export function useWallet() {
  const { setAddress, setWalletType, reset } = useWalletStore();

  const openModal = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const k = getKit();

      k.openModal({
        onWalletSelected: async (option) => {
          try {
            k.setWallet(option.id);
            const { address } = await k.getAddress();

            if (!address) {
              throw WalletError.fromCode('NOT_CONNECTED');
            }

            // Validate network
            const network = await k.getNetwork().catch(() => null);
            if (network && network.networkPassphrase !== 'Test SDF Network ; September 2015') {
              throw WalletError.fromCode('WRONG_NETWORK');
            }

            setAddress(address);
            setWalletType(option.id);
            resolve(address);
          } catch (err) {
            if (err instanceof WalletError) {
              reject(err);
            } else {
              const msg = String(err);
              if (msg.includes('User declined') || msg.includes('rejected')) {
                reject(WalletError.fromCode('USER_REJECTED'));
              } else if (msg.includes('locked')) {
                reject(WalletError.fromCode('LOCKED'));
              } else {
                reject(new WalletError('NOT_CONNECTED', msg));
              }
            }
          }
        },
        onClosed: (err) => {
          if (err) reject(WalletError.fromCode('USER_REJECTED'));
        },
      });
    });
  };

  const signXdr = async (xdr: string): Promise<string> => {
    const k = getKit();
    try {
      const { signedTxXdr } = await k.signTransaction(xdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      return signedTxXdr;
    } catch (err) {
      const msg = String(err);
      if (msg.includes('rejected') || msg.includes('declined')) {
        throw WalletError.fromCode('USER_REJECTED');
      }
      throw new WalletError('NOT_CONNECTED', 'Signing failed: ' + msg);
    }
  };

  const disconnect = () => {
    kit = null;
    reset();
  };

  return { openModal, signXdr, disconnect };
}
```

---

## Part 5 — Contract Hook (read + write)

### File: `src/hooks/useContract.ts`

```typescript
import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  SorobanRpc,
  xdr,
} from '@stellar/stellar-sdk';
import { useWalletStore } from '../store/walletStore';
import { useWallet } from './useWallet';
import { useTxStore } from '../store/txStore';
import { CONTRACT_ADDRESS, NETWORK } from '../constants/contract';
import { ContractError } from '../errors/ContractError';
import { NetworkError } from '../errors/NetworkError';

const rpc = new SorobanRpc.Server(NETWORK.rpcUrl);

export function useContract() {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const { setTx, updateTxStatus } = useTxStore();

  // ── READ ──────────────────────────────────────────────────

  const getCount = async (): Promise<number> => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpc.getAccount(address!);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_count'))
        .setTimeout(30)
        .build();

      const sim = await rpc.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) {
        throw ContractError.fromStellarError(sim.error);
      }

      const result = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result;
      return result ? Number(scValToNative(result.retval)) : 0;
    } catch (err) {
      if (err instanceof ContractError) throw err;
      throw ContractError.fromStellarError(err);
    }
  };

  const getRequest = async (id: number) => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpc.getAccount(address!);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call('get_request', nativeToScVal(id, { type: 'u64' }))
        )
        .setTimeout(30)
        .build();

      const sim = await rpc.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) {
        throw ContractError.fromStellarError(sim.error);
      }

      const result = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result;
      return result ? scValToNative(result.retval) : null;
    } catch (err) {
      if (err instanceof ContractError) throw err;
      throw ContractError.fromStellarError(err);
    }
  };

  // ── WRITE ─────────────────────────────────────────────────

  const createRequest = async (
    toAddress: string,
    amountXlm: string,
    memo: string
  ): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const txId = `tx_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: `Create request: ${amountXlm} XLM → ${toAddress.slice(0, 6)}...` });

    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpc.getAccount(address);

      const amountStroops = Math.round(parseFloat(amountXlm) * 10_000_000);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'create_request',
            new Address(address).toScVal(),
            new Address(toAddress).toScVal(),
            nativeToScVal(amountStroops, { type: 'i128' }),
            nativeToScVal(memo, { type: 'string' }),
          )
        )
        .setTimeout(30)
        .build();

      // Simulate first
      const sim = await rpc.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) {
        updateTxStatus(txId, 'failed');
        throw ContractError.fromStellarError(sim.error);
      }

      const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpc.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      if (response.status === 'ERROR') {
        updateTxStatus(txId, 'failed');
        throw NetworkError.fromHorizonError(response);
      }

      // Poll for confirmation
      let getResponse = await rpc.getTransaction(response.hash);
      let attempts = 0;
      while (getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await rpc.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        updateTxStatus(txId, 'success', response.hash);
        return response.hash;
      } else {
        updateTxStatus(txId, 'failed');
        throw new NetworkError('TX_FAILED', 'Transaction did not confirm in time.');
      }
    } catch (err) {
      updateTxStatus(txId, 'failed');
      throw err;
    }
  };

  const markPaid = async (requestId: number): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const txId = `tx_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: `Mark request #${requestId} as paid` });

    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpc.getAccount(address);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'mark_paid',
            new Address(address).toScVal(),
            nativeToScVal(requestId, { type: 'u64' }),
          )
        )
        .setTimeout(30)
        .build();

      const sim = await rpc.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) {
        updateTxStatus(txId, 'failed');
        throw ContractError.fromStellarError(sim.error);
      }

      const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpc.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      let getResponse = await rpc.getTransaction(response.hash);
      let attempts = 0;
      while (getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await rpc.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        updateTxStatus(txId, 'success', response.hash);
        return response.hash;
      } else {
        updateTxStatus(txId, 'failed');
        throw new NetworkError('TX_FAILED', 'Transaction did not confirm.');
      }
    } catch (err) {
      updateTxStatus(txId, 'failed');
      throw err;
    }
  };

  return { getCount, getRequest, createRequest, markPaid };
}
```

---

## Part 6 — Transaction Status Store + Bar

### File: `src/store/txStore.ts`

```typescript
import { create } from 'zustand';

export type TxStatus = 'pending' | 'signing' | 'confirming' | 'success' | 'failed';

export interface TxRecord {
  id: string;
  status: TxStatus;
  description: string;
  hash?: string;
  timestamp: Date;
}

interface TxStore {
  transactions: TxRecord[];
  setTx: (tx: Omit<TxRecord, 'timestamp'>) => void;
  updateTxStatus: (id: string, status: TxStatus, hash?: string) => void;
  clearCompleted: () => void;
}

export const useTxStore = create<TxStore>((set) => ({
  transactions: [],
  setTx: (tx) =>
    set((s) => ({
      transactions: [{ ...tx, timestamp: new Date() }, ...s.transactions],
    })),
  updateTxStatus: (id, status, hash) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, status, hash: hash ?? t.hash } : t
      ),
    })),
  clearCompleted: () =>
    set((s) => ({
      transactions: s.transactions.filter(
        (t) => t.status === 'pending' || t.status === 'signing' || t.status === 'confirming'
      ),
    })),
}));
```

### File: `src/components/tx/TxStatusBar.tsx`

```tsx
import { useTxStore, TxStatus } from '../../store/txStore';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

const STATUS_CONFIG: Record<TxStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Preparing transaction...', color: '#F59E0B', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  signing:    { label: 'Waiting for wallet signature...', color: '#8B5CF6', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  confirming: { label: 'Confirming on chain...', color: '#3B82F6', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  success:    { label: 'Confirmed!', color: '#10B981', icon: <CheckCircle className="w-4 h-4" /> },
  failed:     { label: 'Failed', color: '#EF4444', icon: <XCircle className="w-4 h-4" /> },
};

export function TxStatusBar() {
  const { transactions, clearCompleted } = useTxStore();
  const active = transactions.slice(0, 5);

  if (active.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 space-y-2 z-50">
      {active.map((tx) => {
        const cfg = STATUS_CONFIG[tx.status];
        return (
          <div
            key={tx.id}
            className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span className="text-xs font-semibold text-gray-800 flex-1">{cfg.label}</span>
              {(tx.status === 'success' || tx.status === 'failed') && (
                <button
                  onClick={clearCompleted}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{tx.description}</p>
            {tx.hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View on Explorer
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Part 7 — Contract Event Feed

### File: `src/store/eventStore.ts`

```typescript
import { create } from 'zustand';

export interface ContractEvent {
  id: string;
  type: 'created' | 'paid' | 'rejected';
  requestId: number;
  actor: string;
  amount?: number;
  ledger: number;
  timestamp: Date;
}

interface EventStore {
  events: ContractEvent[];
  lastLedger: number;
  addEvents: (events: ContractEvent[]) => void;
  setLastLedger: (ledger: number) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  lastLedger: 0,
  addEvents: (newEvents) =>
    set((s) => ({ events: [...newEvents, ...s.events].slice(0, 50) })),
  setLastLedger: (lastLedger) => set({ lastLedger }),
}));
```

### File: `src/hooks/useContractEvents.ts`

```typescript
import { useEffect } from 'react';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { useEventStore, ContractEvent } from '../store/eventStore';
import { CONTRACT_ADDRESS, NETWORK } from '../constants/contract';

const rpc = new SorobanRpc.Server(NETWORK.rpcUrl);

export function useContractEvents() {
  const { addEvents, lastLedger, setLastLedger } = useEventStore();

  useEffect(() => {
    const poll = async () => {
      try {
        const latest = await rpc.getLatestLedger();
        const startLedger = lastLedger === 0
          ? Math.max(1, latest.sequence - 200)
          : lastLedger + 1;

        if (startLedger > latest.sequence) return;

        const response = await rpc.getEvents({
          startLedger,
          filters: [
            {
              type: 'contract',
              contractIds: [CONTRACT_ADDRESS],
            },
          ],
          limit: 20,
        });

        if (response.events.length > 0) {
          const parsed: ContractEvent[] = response.events.map((e: any) => {
            const topics = e.topic ?? [];
            const eventType = topics[1]?.value ?? 'unknown';
            return {
              id: e.id,
              type: eventType as ContractEvent['type'],
              requestId: Number(e.value?.value?.[0]?.value ?? 0),
              actor: String(e.value?.value?.[1]?.value ?? ''),
              amount: e.value?.value?.[2]?.value
                ? Number(e.value.value[2].value) / 10_000_000
                : undefined,
              ledger: e.ledger,
              timestamp: new Date(e.ledgerClosedAt ?? Date.now()),
            };
          });
          addEvents(parsed);
        }

        setLastLedger(latest.sequence);
      } catch (err) {
        console.warn('Event polling error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 10_000); // every 10s
    return () => clearInterval(interval);
  }, [lastLedger]);
}
```

### File: `src/components/events/EventFeed.tsx`

```tsx
import { useEventStore, ContractEvent } from '../../store/eventStore';
import { useContractEvents } from '../../hooks/useContractEvents';
import { CheckCircle, PlusCircle, XCircle, Loader2 } from 'lucide-react';

const EVENT_CONFIG = {
  created: { icon: <PlusCircle className="w-4 h-4 text-violet-500" />, color: 'text-violet-700', bg: 'bg-violet-50', label: 'Request created' },
  paid:    { icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-700', bg: 'bg-green-50', label: 'Paid' },
  rejected:{ icon: <XCircle className="w-4 h-4 text-red-400" />, color: 'text-red-700', bg: 'bg-red-50', label: 'Rejected' },
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function EventFeed() {
  useContractEvents();
  const { events } = useEventStore();

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-sm">Listening for contract events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => {
        const cfg = EVENT_CONFIG[e.type] ?? EVENT_CONFIG.created;
        return (
          <div key={e.id} className={`flex items-start gap-3 ${cfg.bg} rounded-xl p-3`}>
            <div className="mt-0.5">{cfg.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cfg.color}`}>
                {cfg.label} — Request #{e.requestId}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {e.actor.slice(0, 8)}...{e.actor.slice(-4)}
                {e.amount !== undefined ? ` · ${e.amount.toFixed(2)} XLM` : ''}
              </p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(e.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Part 8 — Multi-Wallet Connect Component

### File: `src/components/wallet/WalletConnect.tsx` (full replacement)

```tsx
import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { WalletError } from '../../errors/WalletError';
import toast from 'react-hot-toast';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_INSTALLED: '🔌 No wallet found. Install Freighter, Lobstr, or xBull.',
  USER_REJECTED: '❌ Connection cancelled.',
  WRONG_NETWORK: '🌐 Please switch your wallet to Stellar Testnet.',
  LOCKED: '🔒 Wallet is locked. Please unlock it.',
};

export function WalletConnect() {
  const [loading, setLoading] = useState(false);
  const { openModal } = useWallet();

  const handleConnect = async () => {
    setLoading(true);
    try {
      await openModal();
      toast.success('Wallet connected!');
    } catch (err) {
      if (err instanceof WalletError) {
        toast.error(ERROR_MESSAGES[err.code] ?? err.message);
      } else {
        toast.error('Connection failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
```

---

## Part 9 — Updated Dashboard

Add 2 new tabs to the existing Dashboard: **Contract** and **Events**.

```tsx
// Add to TABS array in Dashboard.tsx:
{ id: 'contract', label: 'Contract', icon: FileCode },
{ id: 'events',   label: 'Live Feed', icon: Radio },

// Add panels:
{activeTab === 'contract' && <ContractRequests />}
{activeTab === 'events'   && <EventFeed />}

// Add TxStatusBar globally at bottom of Dashboard:
<TxStatusBar />
```

### File: `src/components/contract/ContractRequests.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { useWalletStore } from '../../store/walletStore';
import { ContractError } from '../../errors/ContractError';
import { NetworkError } from '../../errors/NetworkError';
import { CONTRACT_ADDRESS } from '../../constants/contract';
import { ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ContractRequests() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const { createRequest, getCount } = useContract();
  const { isConnected } = useWalletStore();

  useEffect(() => {
    if (isConnected) {
      getCount()
        .then(setCount)
        .catch(() => setCount(null));
    }
  }, [isConnected]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const hash = await createRequest(to, amount, memo);
      toast.success('On-chain request created!');
      setTo(''); setAmount(''); setMemo('');
      const newCount = await getCount();
      setCount(newCount);
    } catch (err) {
      if (err instanceof ContractError || err instanceof NetworkError) {
        toast.error(err.userMessage);
      } else {
        toast.error('Unexpected error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
        <div>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Contract</p>
          <p className="text-xs font-mono text-violet-800 mt-0.5 break-all">{CONTRACT_ADDRESS}</p>
          {count !== null && (
            <p className="text-xs text-violet-500 mt-1">{count} total on-chain requests</p>
          )}
        </div>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-violet-400 hover:text-violet-600"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Create On-Chain Request</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Payer Address (G...)</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="G..."
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (XLM)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Memo</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Hotel split"
            maxLength={28}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !isConnected}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Creating on chain...' : 'Create On-Chain Request'}
        </button>
      </form>
    </div>
  );
}
```

---

## Part 10 — Updated Wallet Store

```typescript
// Add to walletStore.ts:
interface WalletStore extends WalletState {
  walletType: string | null;       // ← NEW
  setWalletType: (type: string) => void;  // ← NEW
  // ... existing fields
}

// In create():
walletType: null,
setWalletType: (walletType) => set({ walletType }),

// In reset():
reset: () => set({ address: null, balance: null, isConnected: false, walletType: null }),
```

---

## Part 11 — Updated package.json

```json
{
  "dependencies": {
    "@creit-tech/stellar-wallets-kit": "^1.5.0",
    "@stellar/freighter-api": "^2.0.0",
    "@stellar/stellar-sdk": "^12.0.0",
    "lucide-react": "^0.400.0",
    "nanoid": "^5.0.7",
    "qrcode.react": "^3.1.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.24.0",
    "zustand": "^4.5.4"
  }
}
```

---

## README Additions for Yellow Belt

```markdown
## Level 2 — Yellow Belt

### Contract
- **Address:** `CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Network:** Stellar Testnet
- **Explorer:** https://stellar.expert/explorer/testnet/contract/CXXX...

### Deploy Transaction Hash
`abcd1234...` — verified on Stellar Expert

### Wallets Supported
- Freighter
- Lobstr
- xBull
- WalletConnect (via StellarWalletsKit)

### Error Handling
| Type | Codes handled |
|---|---|
| WalletError | NOT_INSTALLED, USER_REJECTED, WRONG_NETWORK, LOCKED, NOT_CONNECTED |
| ContractError | INVOKE_FAILED, SIMULATION_FAILED, NOT_FOUND, UNAUTHORIZED, CONTRACT_PANIC |
| NetworkError | HORIZON_UNAVAILABLE, TIMEOUT, INSUFFICIENT_FEE, RATE_LIMITED, TX_FAILED |

### Screenshots
[Add: wallet modal with multiple options, contract panel, event feed, tx status bar]
```

---

## Git Commit Plan (minimum 2 meaningful commits)

```bash
# Commit 1 — Multi-wallet + error system
git add src/errors/ src/hooks/useWallet.ts src/components/wallet/
git commit -m "feat: add StellarWalletsKit multi-wallet support and typed error classes"

# Commit 2 — Soroban contract + frontend integration
git add contracts/ src/hooks/useContract.ts src/constants/ src/components/contract/
git commit -m "feat: deploy PaymentRequest Soroban contract and add contract panel"

# Commit 3 — Event feed + tx status tracker
git add src/store/txStore.ts src/store/eventStore.ts src/hooks/useContractEvents.ts src/components/
git commit -m "feat: add real-time contract event feed and transaction status tracker"

# Commit 4 — Dashboard update + polish
git add src/pages/Dashboard.tsx README.md
git commit -m "chore: wire contract + events tabs into dashboard, update README for Yellow Belt"
```

---

## Build Order for Codex

Give these tasks to Codex in this order:

1. `Install @creit-tech/stellar-wallets-kit`
2. `Create src/errors/WalletError.ts, ContractError.ts, NetworkError.ts`
3. `Update src/store/walletStore.ts to add walletType field`
4. `Create src/store/txStore.ts`
5. `Create src/store/eventStore.ts`
6. `Create src/constants/contract.ts with placeholder address`
7. `Replace src/hooks/useWallet.ts with StellarWalletsKit version`
8. `Replace src/components/wallet/WalletConnect.tsx`
9. `Create src/hooks/useContract.ts`
10. `Create src/hooks/useContractEvents.ts`
11. `Create src/components/tx/TxStatusBar.tsx`
12. `Create src/components/events/EventFeed.tsx`
13. `Create src/components/contract/ContractRequests.tsx`
14. `Update src/pages/Dashboard.tsx: add Contract + Events tabs + TxStatusBar`
15. `Build Soroban contract: cargo build in contracts/payment_requests`
16. `Deploy contract with stellar-cli and save address`
17. `Update src/constants/contract.ts with real deployed address`
18. `Test: create request from UI, verify on Stellar Expert`
19. `Make 4 commits following the commit plan above`
20. `Update README with contract address, deploy tx hash, screenshots`

---

## Submission Checklist

| Requirement | Status |
|---|---|
| StellarWalletsKit with 2+ wallet options | ✅ |
| 3 error types handled (Wallet, Contract, Network) | ✅ |
| Soroban contract deployed on Testnet | ✅ |
| Contract called from frontend (create_request, get_count) | ✅ |
| Transaction status visible (pending → signing → confirming → done) | ✅ |
| Real-time event feed | ✅ |
| Minimum 2+ meaningful commits | ✅ |
| Public GitHub repo + README | ✅ |
| Deployed contract address in README | ✅ |
| Transaction hash of contract call in README | ✅ |
| Screenshot: wallet options modal | ✅ |
| Live demo on Vercel | ✅ |
```
