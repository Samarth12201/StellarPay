# StellarPay – Smart Bill Splitting & QR Payments on Stellar

Split bills, send payment requests, and pay instantly with QR links on Stellar Testnet.

## Features

- Freighter wallet connect / disconnect
- Live XLM balance from Horizon Testnet
- Send XLM with memo support and Stellar Expert transaction links
- Equal and custom bill splitting
- Local payment request inbox
- QR payment links and public `/pay` page

## Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS · Stellar SDK · Freighter API · Zustand · qrcode.react

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`, install Freighter, switch it to Testnet, and fund your wallet with Friendbot:

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
