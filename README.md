# StellarPay – Smart Bill Splitting & QR Payments on Stellar

[![CI](https://github.com/Samarth12201/StellarPay/actions/workflows/ci.yml/badge.svg)](https://github.com/Samarth12201/StellarPay/actions/workflows/ci.yml)
[![Deploy to Vercel](https://github.com/Samarth12201/StellarPay/actions/workflows/deploy.yml/badge.svg)](https://github.com/Samarth12201/StellarPay/actions/workflows/deploy.yml)
![CI/CD Status](https://img.shields.io/badge/CI%2FCD-passing-success?style=flat-square&logo=github-actions)
![Vercel Status](https://img.shields.io/badge/Vercel-deployed-blue?style=flat-square&logo=vercel)

## 🎥 Demo Video

<a href="https://youtu.be/faK0azNC8vo" target="_blank">
  <img src="https://img.youtube.com/vi/faK0azNC8vo/maxresdefault.jpg" alt="StellarPay Demo Video" width="100%" style="max-width: 640px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.15);" />
</a>

*Click the banner above to watch the full project walkthrough.*

Split bills, send payment requests, and pay instantly with QR links on Stellar Testnet.

---

## ⚪️ Level 1 - White Belt Submission

### 👉 Overview
This section covers the foundational integration with the Stellar Testnet. It provides basic wallet connectivity, balance tracking, and native XLM transfers.

### Features
- Freighter wallet connect / disconnect
- Live XLM balance from Horizon Testnet
- Send XLM with memo support and Stellar Expert transaction links
- Equal and custom bill splitting
- Local payment request inbox
- QR payment links and public `/pay` page

### Tech Stack
React 18 · TypeScript · Vite · Tailwind CSS · Stellar SDK · Freighter API · Zustand · qrcode.react

### ✅ Requirements Met
- **Freighter wallet connect / disconnect:** Yes.
- **Live XLM balance from Horizon Testnet:** Yes.
- **Send XLM with memo support:** Yes.
- **Equal and custom bill splitting UI:** Yes.
- **QR payment links and public `/pay` page:** Yes.

---

## 🟡 Level 2 - Yellow Belt Submission

### 👉 Overview
Building on the White Belt skills, this project integrates multiple wallets, features a custom deployed smart contract, and implements real-time event handling.
**Focus:** Multi-wallet integration, smart contract deployment, and real-time data synchronization.

**What is implemented in this submission:**
- `StellarWalletsKit` implementation with multiple wallets (Freighter, Albedo, xBull, Lobstr, Hana).
- Error handling (wallet not found, rejected, wrong network).
- Deployed a custom Soroban smart contract to the testnet.
- Calling contract functions directly from the React frontend.
- Reading and writing data to the contract.
- Event listening and state synchronization (live feed).
- Transaction status tracking (pending/success/fail) using a global store.

### Tech Stack Additions
Stellar Wallets Kit · Soroban Smart Contracts (Rust)

### ✅ Requirements Met
- **3 error types handled:** Yes (User Rejected, Wrong Network, Simulation Failed/Unauthorized).
- **Contract deployed on testnet:** Yes (See details below).
- **Contract called from the frontend:** Yes (Create Request & Mark Paid).
- **Transaction status visible:** Yes (Bottom-right toast tracker).
- **Multi-wallet app:** Yes.
- **Real-time event integration:** Yes.

### 📝 Contract Details
- **Deployed Contract Address:** `CBJJMXJVIXE6ZAK7WBOFX46ATAEJEXRJUNETL5RXR7J6LF35GMN3G742` (Stellar Testnet)

### 🔗 Transaction hash of a contract call
- **Hash:** `ba9b8565b86502f082566ac24a97ebe5d723eb1fe103ac1901b31ffb7c51417a` *(Verifiable on Stellar Explorer)*



---

## 🟠 Level 3 - Orange Belt Submission

### 👉 Overview
Production-grade decentralized group expense settlement dApp with multi-contract architecture, USDC stablecoin support, crowdfunding escrow pools, automated CI/CD, and responsive mobile-first UI.

**Focus:** Advanced smart contracts, inter-contract communication, CI/CD pipelines, production architecture, and comprehensive testing.

### What is implemented in this submission:
- **GroupExpense Smart Contract (Rust/Soroban):** On-chain group creation, expense tracking, pool escrow, and USDC settlements via inter-contract calls.
- **Inter-Contract Communication:** The `settle_expense_with_token` function calls the USDC SAC (Stellar Asset Contract) via `token::Client` for atomic cross-contract token transfers.
- **Crowdfunded Escrow Pools:** Users create on-chain voluntary donation campaigns. Contributions are held in contract escrow; only the creator can withdraw.
- **USDC Stablecoin Settlements:** Full support for Circle Testnet USDC (SEP-41 SAC) alongside native XLM for expense splits and pool contributions.
- **Settlement Engine:** Minimum-transaction path algorithm ("net balance") to calculate fewest possible payments.
- **Comprehensive Testing:** 17 frontend unit tests (Vitest) + 3 Rust contract unit tests (cargo test).
- **CI/CD Pipeline:** GitHub Actions for automated typecheck, testing, and Vercel deployment on every push.
- **Mobile-Responsive UI:** Bottom navigation bar, responsive layouts, touch-friendly controls.
- **Real-Time Sync:** Supabase cloud sync + real-time subscription for cross-device payment request notifications.
- **Error Handling & Loading States:** Global `ErrorBoundary`, transaction status tracker, skeleton loading, toast notifications.

### ✅ Requirements Met
| Requirement | Status | Details |
|---|---|---|
| Advanced smart contract development | ✅ | GroupExpense contract with pools, escrow, settlements |
| Inter-contract communication | ✅ | `settle_expense_with_token` calls USDC SAC contract |
| Event streaming & real-time updates | ✅ | Supabase realtime + contract event feed |
| CI/CD pipeline setup | ✅ | `.github/workflows/ci.yml` + `deploy.yml` |
| Smart contract deployment workflow | ✅ | Compiled, optimized, deployed via Stellar CLI |
| Mobile responsive frontend | ✅ | `MobileNav` + Tailwind responsive classes |
| Error handling & loading states | ✅ | ErrorBoundary, TxStatusBar, toast notifications |
| Tests for contracts and frontend | ✅ | 17 Vitest tests + 3 Rust contract tests |
| Production-ready architecture | ✅ | Zustand stores, Supabase sync, env config |
| Documentation & demo | ✅ | Full README, WALKTHROUGH.md, screenshots |

### 📝 Contract Details

**Payment Request Contract (Level 2):**
- **Address:** `CBJJMXJVIXE6ZAK7WBOFX46ATAEJEXRJUNETL5RXR7J6LF35GMN3G742`
- **Tx Hash:** `ba9b8565b86502f082566ac24a97ebe5d723eb1fe103ac1901b31ffb7c51417a`

**Group Expense & Pools Contract (Level 3):**
- **Address:** `CCXGCUR7WRG75FT3M4DW763MMQW6ZHDFRPHVX6L5W67MWY3ED5YVBELB`
- **Functions:** `create_group`, `add_expense`, `settle_expense`, `settle_expense_with_token`, `create_pool`, `contribute_pool`, `withdraw_pool`

**USDC SAC Contract (Circle Testnet):**
- **Address:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- **Issuer:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

### 🔗 Links
- **Live Demo:** [https://stellarpay.vercel.app](https://stellarpay.vercel.app)
- **GitHub:** [https://github.com/Samarth12201/StellarPay](https://github.com/Samarth12201/StellarPay)
- **CI/CD:** [GitHub Actions](https://github.com/Samarth12201/StellarPay/actions)

### 🧪 Running Tests

```bash
# Frontend tests (17 tests)
npm run test

# Rust contract tests (3 tests)
cd contracts/group_expense && cargo test
```

---

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`, install Freighter (or any supported wallet), switch it to Testnet, and fund your wallet with Friendbot:

```text
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

## Environment

```env
VITE_STELLAR_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_APP_URL=http://localhost:5173
```

## Build

```bash
npm run build
```

## Screenshots

### Level 1 Screenshots

#### Landing Page
![Landing Page](./screenshots/screenshot_1.png)

#### Wallet Connected & Transaction Result
*(Includes Wallet connected state, Balance displayed, and Transaction result shown to the user)*
![Wallet Connected & Transaction Result](./screenshots/screenshot_0.png)

#### Successful Testnet Transaction (Level 1)
*(Stellar Expert Explorer View)*
![Successful testnet transaction](./screenshots/screenshot_2.png)

### Level 2 Screenshots

#### Wallet Options Available
*(Showcase the @creit.tech/stellar-wallets-kit modal with wallet options)*
![Wallet Options](./screenshots/wallet_options.png)

#### Successful Testnet Transaction (Level 2 Contract Call)
*(Stellar Expert Explorer View)*
![Successful testnet transaction](./screenshots/stellar_expert_tx.png)

