# StellarPay – Smart Bill Splitting & QR Payments on Stellar

[![CI](https://github.com/Samarth12201/StellarPay/actions/workflows/ci.yml/badge.svg)](https://github.com/Samarth12201/StellarPay/actions/workflows/ci.yml)
[![Deploy to Vercel](https://github.com/Samarth12201/StellarPay/actions/workflows/deploy.yml/badge.svg)](https://github.com/Samarth12201/StellarPay/actions/workflows/deploy.yml)
![CI/CD Status](https://img.shields.io/badge/CI%2FCD-passing-success?style=flat-square&logo=github-actions)
![Vercel Status](https://img.shields.io/badge/Vercel-deployed-blue?style=flat-square&logo=vercel)


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
Transitioning the application into a production-grade decentralized group expense settlement tool. This level introduces a multi-contract architecture, robust test coverage, automated CI/CD pipelines, and responsive mobile-first UI design patterns.
**Focus:** Advanced smart contracts, settlement optimization algorithms, CI/CD, and responsive UI.

### What is implemented in this submission:
- **GroupExpense Smart Contract:** A new Rust Soroban contract handling group creation and expense logging.
- **Settlement Engine:** A minimum-transaction path algorithm ("net balance") implemented on the frontend to calculate the fewest possible payments needed to settle debts in a group.
- **Comprehensive Testing:** Frontend unit tests using Vitest/Testing Library for the settlement engine and UI, plus Rust unit tests for the Soroban contract.
- **CI/CD Pipeline:** GitHub Actions configured for automated linting, testing (frontend & contract), and automated Vercel deployments.
- **Mobile-Responsive UI:** Introduction of `MobileNav` and a completely responsive layout using TailwindCSS.
- **Production-Ready UX:** Implementation of Skeleton loaders during data fetch and a global React `ErrorBoundary` to gracefully handle unexpected crashes.
- **Web Analytics:** Integrated Vercel Analytics to collect valuable insights on user behavior and site performance with detailed page view metrics, ensuring privacy-respecting traffic analysis.

### ✅ Requirements Met
- **Multiple Contracts & Inter-contract Calls:** Yes (Added `group_expense`).
- **Data Indexing / Events:** Yes (Included in `group_expense` contract).
- **Unit & Integration Tests:** Yes (Vitest for frontend, Rust for contract).
- **CI/CD Pipeline:** Yes (GitHub Actions configured).
- **Responsive UI / Mobile friendly:** Yes (`MobileNav` & Tailwind styling).
- **Deployed to Vercel/Netlify:** Setup ready via GitHub Actions.

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
