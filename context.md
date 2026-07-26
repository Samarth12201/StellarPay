# StellarPay — Project Context & Resource Guide

## 📌 Project Overview
**StellarPay** is a production-ready, mobile-responsive dApp on the **Stellar Testnet** designed for smart bill splitting, voluntary crowdfunding escrow pools, instant QR payments, multi-currency display, and seamless fiat off-ramps via SEP-24 (MoneyGram).

---

## 🚀 Tech Stack & Infrastructure

### 🎨 Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS (Vanilla CSS + responsive layouts)
- **State Management:** Zustand (with local persistence & Supabase sync)
- **Data Fetching:** `@tanstack/react-query`
- **Routing:** `react-router-dom` v6
- **Icons & UI:** `lucide-react`, `react-hot-toast`, `qrcode.react`
- **PWA:** `vite-plugin-pwa` (service worker & offline-ready manifest)
- **Analytics & Performance:** `@vercel/analytics`, `@vercel/speed-insights`

### ⚙️ Blockchain & Stellar Integration
- **SDK:** `@stellar/stellar-sdk` v13
- **Wallets:** Freighter (`@stellar/freighter-api`) + Stellar Wallets Kit (`@creit.tech/stellar-wallets-kit`) supporting Freighter, Albedo, xBull, Lobstr, and Hana.
- **Contracts:** Soroban Smart Contracts written in Rust (compiled to WASM).
- **Network:** Stellar Testnet (`https://horizon-testnet.stellar.org` & `https://soroban-testnet.stellar.org`).

### 🗄️ Database & Realtime
- **Provider:** Supabase (PostgreSQL)
- **Features:** Realtime Postgres Subscriptions (`groups`, `group_members`, `expenses`, `pools`, `payment_requests`, `user_profiles`, `group_invitations`, `user_feedback`), Row Level Security (RLS).

---

## 📜 Deployed Smart Contracts

| Contract Name | Address / Explorer Link | Purpose |
|---|---|---|
| **Payment Requests Contract (L2)** | `CBJJMXJVIXE6ZAK7WBOFX46ATAEJEXRJUNETL5RXR7J6LF35GMN3G742` | On-chain payment request creation and tracking |
| **Group Expense & Pools Contract (L3)** | `CCXGCUR7WRG75FT3M4DW763MMQW6ZHDFRPHVX6L5W67MWY3ED5YVBELB` | On-chain bill splitting, debt settlement, USDC transfers, voluntary escrow pools |
| **Circle Testnet USDC SAC** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | Stellar Asset Contract (SAC) for testnet USDC |

---

## 🌐 External APIs & Standards

- **SEP-10 / SEP-24 Anchor:** MoneyGram Interactive Off-Ramp (`https://extstellar.moneygram.com`)
- **FX Exchange Rates:** CoinGecko Simple Price API (`https://api.coingecko.com/api/v3/simple/price`) for XLM/USD, INR, MXN, PHP, EUR, GBP conversions.
- **Explorer:** [Stellar Expert Testnet](https://stellar.expert/explorer/testnet)
- **Friendbot:** `https://friendbot.stellar.org/?addr={PUBLIC_KEY}`

---

## 📂 Key Directory Structure

```text
StellarPay/
├── contracts/                     # Soroban Rust contracts
│   ├── group_expense/             # Level 3 Group expense & escrow pool contract
│   └── payment_requests/          # Level 2 Payment request contract
├── src/
│   ├── components/
│   │   ├── contract/              # Smart contract interaction components
│   │   ├── events/                # Real-time event feed for Soroban events
│   │   ├── feedback/              # User feedback modal
│   │   ├── fx/                    # Live FX badge component
│   │   ├── groups/                # Group detail, expenses, settlements UI
│   │   ├── layout/                # MobileNav, TxStatusBar, ErrorBoundary
│   │   ├── pools/                 # Voluntary crowdfunding pool UI
│   │   ├── requests/              # Payment request inbox
│   │   └── wallet/                # WalletConnect modal & status
│   ├── constants/                 # Assets, contract addresses, network config
│   ├── hooks/                     # Custom React hooks (wallet, contract, SEP24, FX, profile, realtime)
│   ├── lib/                       # Supabase client & Vercel Analytics tracking helper
│   ├── pages/                     # Dashboard, Profile, Onboarding, GroupInvite, AnchorWithdraw
│   ├── store/                     # Zustand stores (walletStore, groupStore, requestStore)
│   └── utils/                     # Formatters, Stellar SDK helpers
├── supabase_schema.sql            # Master Supabase SQL setup script
└── supabase_migration_level4.sql   # Level 4 incremental migration script
```

---

## 🛠️ Key Environment Variables (`.env`)

```env
VITE_STELLAR_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_APP_URL=http://localhost:5173
VITE_SUPABASE_URL=<YOUR_SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_MGI_ANCHOR_URL=https://extstellar.moneygram.com
VITE_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
VITE_COINGECKO_URL=https://api.coingecko.com/api/v3/simple/price
```

---

## 📊 Summary of Level Progressions
- **Level 1 (White Belt):** Wallet connection (Freighter), live XLM balances, basic XLM transfer with memo, equal bill split logic, public `/pay` QR page.
- **Level 2 (Yellow Belt):** Multi-wallet support (Stellar Wallets Kit), custom Rust payment request contract, contract calls from React, event feeds, transaction status tracker.
- **Level 3 (Orange Belt):** GroupExpense contract, USDC SAC inter-contract calls, crowdfunding escrow pools, minimum transaction net settlement algorithm, Vitest + Rust tests, automated CI/CD.
- **Level 4 (Green Belt):** Production MVP, Vercel Web Analytics & Speed Insights, User Profiles, 4-step onboarding, group invite links (`/invite/:code`), MoneyGram SEP-24 off-ramp, PWA installation, User feedback modal.
