# StellarPay — Level 1 White Belt Dev Plan
## Stellar Journey to Mastery | Monthly Builder Challenge

---

## Project Overview

**Name:** StellarPay – Smart Bill Splitting & QR Payments on Stellar  
**Tagline:** Split bills, send payment requests, and pay instantly using QR codes on Stellar.  
**Network:** Stellar Testnet  
**Wallet:** Freighter  
**Stack:** React + TypeScript + Vite + Tailwind CSS  

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Industry standard, great Stellar SDK support |
| Build Tool | Vite | Fast dev server, optimized builds |
| Styling | Tailwind CSS | Utility-first, rapid UI dev |
| Stellar SDK | @stellar/stellar-sdk | Official Stellar JS SDK |
| Wallet | @stellar/freighter-api | Official Freighter wallet integration |
| QR Code | qrcode.react | React QR code generator |
| State | Zustand | Lightweight global state |
| Notifications | react-hot-toast | Transaction feedback toasts |
| Icons | lucide-react | Clean, consistent icon set |
| Routing | react-router-dom v6 | SPA routing (landing, dashboard, pay page) |

---

## Folder Structure

```
stellarpay/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Layout.tsx
│   │   ├── wallet/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── WalletInfo.tsx
│   │   │   └── NetworkBadge.tsx
│   │   ├── send/
│   │   │   ├── SendForm.tsx
│   │   │   └── TransactionResult.tsx
│   │   ├── split/
│   │   │   ├── BillSplitter.tsx
│   │   │   ├── ParticipantList.tsx
│   │   │   └── SplitResult.tsx
│   │   ├── qr/
│   │   │   ├── QRGenerator.tsx
│   │   │   └── PaymentLink.tsx
│   │   └── requests/
│   │       ├── RequestCard.tsx
│   │       └── RequestInbox.tsx
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useBalance.ts
│   │   ├── useSendPayment.ts
│   │   └── useTransactionHistory.ts
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   └── PayPage.tsx           ← /pay/:username
│   ├── store/
│   │   ├── walletStore.ts
│   │   ├── requestStore.ts
│   │   └── splitStore.ts
│   ├── utils/
│   │   ├── stellar.ts            ← Stellar SDK helpers
│   │   ├── qr.ts
│   │   └── format.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── README.md
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Environment Variables

```env
# .env.example
VITE_STELLAR_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_APP_URL=http://localhost:5173
```

---

## Core Types

```typescript
// src/types/index.ts

export interface WalletState {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  network: 'TESTNET' | 'MAINNET';
}

export interface Transaction {
  hash: string;
  to: string;
  amount: string;
  memo?: string;
  status: 'success' | 'error' | 'pending';
  timestamp: Date;
}

export interface Participant {
  id: string;
  name: string;
  address?: string;
  amount?: number;    // for custom split
}

export interface BillSplit {
  id: string;
  title: string;
  total: number;
  participants: Participant[];
  splitType: 'equal' | 'custom';
  paidBy: string;     // participant name/address
  createdAt: Date;
}

export interface PaymentRequest {
  id: string;
  from: string;       // who created the request
  to: string;         // who needs to pay
  toAddress: string;  // Stellar address to pay
  amount: string;
  memo?: string;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: Date;
}
```

---

## Feature 1: Wallet Connection

### File: `src/hooks/useWallet.ts`

```typescript
import { getPublicKey, isConnected, signTransaction } from '@stellar/freighter-api';
import { useWalletStore } from '../store/walletStore';

export function useWallet() {
  const { setAddress, setConnected, reset } = useWalletStore();

  const connect = async () => {
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error('Freighter wallet not installed. Please install the Freighter extension.');
      }
      const publicKey = await getPublicKey();
      setAddress(publicKey);
      setConnected(true);
      return publicKey;
    } catch (err) {
      console.error('Wallet connection failed:', err);
      throw err;
    }
  };

  const disconnect = () => {
    reset();
  };

  return { connect, disconnect };
}
```

### File: `src/store/walletStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WalletState } from '../types';

interface WalletStore extends WalletState {
  setAddress: (address: string) => void;
  setBalance: (balance: string) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      address: null,
      balance: null,
      isConnected: false,
      network: 'TESTNET',
      setAddress: (address) => set({ address }),
      setBalance: (balance) => set({ balance }),
      setConnected: (isConnected) => set({ isConnected }),
      reset: () => set({ address: null, balance: null, isConnected: false }),
    }),
    { name: 'stellarpay-wallet' }
  )
);
```

### File: `src/components/wallet/WalletConnect.tsx`

```tsx
import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import toast from 'react-hot-toast';

export function WalletConnect() {
  const [loading, setLoading] = useState(false);
  const { connect } = useWallet();

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connect();
      toast.success('Wallet connected!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect wallet');
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
      {loading ? 'Connecting...' : 'Connect Freighter'}
    </button>
  );
}
```

---

## Feature 2: Balance Display

### File: `src/hooks/useBalance.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { useWalletStore } from '../store/walletStore';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL);

export function useBalance() {
  const { address, setBalance } = useWalletStore();

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    try {
      const account = await server.loadAccount(address);
      const xlmBalance = account.balances.find(
        (b) => b.asset_type === 'native'
      );
      setBalance(xlmBalance?.balance ?? '0');
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setBalance('0');
    }
  }, [address, setBalance]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { fetchBalance };
}
```

---

## Feature 3: Send XLM

### File: `src/hooks/useSendPayment.ts`

```typescript
import { useState } from 'react';
import {
  Horizon,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { useWalletStore } from '../store/walletStore';
import { Transaction } from '../types';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL);

export function useSendPayment() {
  const { address } = useWalletStore();
  const [result, setResult] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPayment = async (to: string, amount: string, memo?: string) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sourceAccount = await server.loadAccount(address);

      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: to,
            asset: Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(30);

      if (memo) {
        txBuilder.addMemo(Memo.text(memo));
      }

      const transaction = txBuilder.build();
      const xdr = transaction.toEnvelope().toXDR('base64');

      const signedXDR = await signTransaction(xdr, {
        network: 'TESTNET',
        networkPassphrase: Networks.TESTNET,
        accountToSign: address,
      });

      const signedTx = TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET);
      const response = await server.submitTransaction(signedTx);

      const tx: Transaction = {
        hash: response.hash,
        to,
        amount,
        memo,
        status: 'success',
        timestamp: new Date(),
      };
      setResult(tx);
      return tx;
    } catch (err: any) {
      const message = err?.response?.data?.extras?.result_codes?.operations?.[0]
        ?? err.message
        ?? 'Transaction failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { sendPayment, result, loading, error, reset: () => { setResult(null); setError(null); } };
}
```

### File: `src/components/send/SendForm.tsx`

```tsx
import { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { useSendPayment } from '../../hooks/useSendPayment';
import { TransactionResult } from './TransactionResult';
import toast from 'react-hot-toast';

export function SendForm() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const { sendPayment, loading, result, error, reset } = useSendPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !amount) return;

    try {
      await sendPayment(to, amount, memo || undefined);
      toast.success('Payment sent!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (result) {
    return <TransactionResult transaction={result} onReset={reset} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recipient Address
        </label>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="G... (Stellar address)"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (XLM)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.0000001"
          step="0.0000001"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Memo (optional)
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="e.g. Dinner split"
          maxLength={28}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !to || !amount}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {loading ? 'Sending...' : 'Send XLM'}
      </button>
    </form>
  );
}
```

### File: `src/components/send/TransactionResult.tsx`

```tsx
import { CheckCircle, ExternalLink, RotateCcw, Copy } from 'lucide-react';
import { Transaction } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  transaction: Transaction;
  onReset: () => void;
}

export function TransactionResult({ transaction, onReset }: Props) {
  const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${transaction.hash}`;

  const copyHash = () => {
    navigator.clipboard.writeText(transaction.hash);
    toast.success('Hash copied!');
  };

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Payment Sent!</h3>
        <p className="text-sm text-gray-500 mt-1">
          {transaction.amount} XLM sent successfully
        </p>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 text-left">
        <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono text-gray-800 truncate flex-1">
            {transaction.hash}
          </p>
          <button onClick={copyHash} className="text-gray-400 hover:text-gray-600">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 border border-violet-200 text-violet-600 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-50 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          View on Explorer
        </a>
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Send Again
        </button>
      </div>
    </div>
  );
}
```

---

## Feature 4: Bill Splitter

### File: `src/components/split/BillSplitter.tsx`

```tsx
import { useState } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Participant } from '../../types';
import { SplitResult } from './SplitResult';
import { nanoid } from 'nanoid';

export function BillSplitter() {
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: nanoid(), name: '', amount: 0 },
  ]);
  const [result, setResult] = useState<any>(null);

  const addParticipant = () => {
    setParticipants((prev) => [...prev, { id: nanoid(), name: '', amount: 0 }]);
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParticipant = (id: string, field: keyof Participant, value: string | number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const calculate = () => {
    const totalNum = parseFloat(total);
    if (isNaN(totalNum) || participants.length === 0) return;

    let splits: { name: string; owes: number }[];

    if (splitType === 'equal') {
      const each = totalNum / participants.length;
      splits = participants.map((p) => ({
        name: p.name || 'Unknown',
        owes: parseFloat(each.toFixed(7)),
      }));
    } else {
      splits = participants.map((p) => ({
        name: p.name || 'Unknown',
        owes: p.amount ?? 0,
      }));
    }

    setResult({ title, total: totalNum, splits, splitType });
  };

  if (result) {
    return <SplitResult result={result} onReset={() => setResult(null)} />;
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Bill title (e.g. Goa Trip Dinner)"
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
      />
      <input
        type="number"
        value={total}
        onChange={(e) => setTotal(e.target.value)}
        placeholder="Total amount (XLM)"
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
      />

      <div className="flex gap-2">
        {(['equal', 'custom'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSplitType(type)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
              splitType === type
                ? 'bg-violet-600 text-white border-violet-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type} Split
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {participants.map((p, i) => (
          <div key={p.id} className="flex gap-2 items-center">
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
              placeholder={`Person ${i + 1}`}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm"
            />
            {splitType === 'custom' && (
              <input
                type="number"
                value={p.amount}
                onChange={(e) => updateParticipant(p.id, 'amount', parseFloat(e.target.value))}
                placeholder="XLM"
                className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-sm"
              />
            )}
            {participants.length > 1 && (
              <button
                onClick={() => removeParticipant(p.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addParticipant}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Person
      </button>

      <button
        onClick={calculate}
        disabled={!total || participants.some((p) => !p.name)}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-medium hover:bg-violet-700 transition-all disabled:opacity-50"
      >
        <Calculator className="w-4 h-4" />
        Calculate Split
      </button>
    </div>
  );
}
```

### File: `src/components/split/SplitResult.tsx`

```tsx
import { useNavigate } from 'react-router-dom';
import { QrCode, Send, RotateCcw } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import { useWalletStore } from '../../store/walletStore';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid';

export function SplitResult({ result, onReset }: { result: any; onReset: () => void }) {
  const { address } = useWalletStore();
  const { addRequests } = useRequestStore();

  const createRequests = () => {
    const requests = result.splits.map((s: any) => ({
      id: nanoid(),
      from: 'You',
      to: s.name,
      toAddress: address ?? '',
      amount: s.owes.toString(),
      memo: result.title,
      status: 'pending' as const,
      createdAt: new Date(),
    }));
    addRequests(requests);
    toast.success(`${requests.length} payment requests created!`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 rounded-xl p-4">
        <p className="text-sm text-violet-600 font-medium">{result.title || 'Bill Split'}</p>
        <p className="text-2xl font-bold text-violet-900 mt-1">{result.total} XLM total</p>
        <p className="text-xs text-violet-500 mt-0.5">{result.splitType} split · {result.splits.length} people</p>
      </div>

      <div className="space-y-2">
        {result.splits.map((s: any, i: number) => (
          <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-gray-800">{s.name}</span>
            <span className="text-sm font-bold text-violet-600">{s.owes} XLM</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4" />
          New Split
        </button>
        <button
          onClick={createRequests}
          disabled={!address}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Create Requests
        </button>
      </div>
    </div>
  );
}
```

---

## Feature 5: QR Code Generator

### File: `src/components/qr/QRGenerator.tsx`

```tsx
import { useState } from 'react';
import QRCode from 'qrcode.react';
import { Download, Copy, Link } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import toast from 'react-hot-toast';

export function QRGenerator() {
  const { address } = useWalletStore();
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const appUrl = import.meta.env.VITE_APP_URL;
  const paymentUrl = `${appUrl}/pay?address=${address}&amount=${amount}&memo=${encodeURIComponent(memo)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(paymentUrl);
    toast.success('Payment link copied!');
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-code canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'stellarpay-qr.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center" id="qr-code">
        {address && (
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <QRCode
              value={paymentUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#7C3AED"
            />
          </div>
        )}
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Pre-fill amount (XLM) — optional"
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
      />
      <input
        type="text"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="Memo (e.g. Dinner) — optional"
        maxLength={28}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
      />

      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <Link className="w-3 h-3" /> Payment Link
        </p>
        <p className="text-xs font-mono text-gray-700 break-all">{paymentUrl}</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyLink}
          className="flex-1 flex items-center justify-center gap-2 border border-violet-200 text-violet-600 py-2.5 rounded-xl text-sm hover:bg-violet-50"
        >
          <Copy className="w-4 h-4" />
          Copy Link
        </button>
        <button
          onClick={downloadQR}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700"
        >
          <Download className="w-4 h-4" />
          Download QR
        </button>
      </div>
    </div>
  );
}
```

---

## Feature 6: Payment Requests

### File: `src/store/requestStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentRequest } from '../types';

interface RequestStore {
  requests: PaymentRequest[];
  addRequests: (reqs: PaymentRequest[]) => void;
  updateStatus: (id: string, status: PaymentRequest['status']) => void;
  clear: () => void;
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set) => ({
      requests: [],
      addRequests: (reqs) =>
        set((s) => ({ requests: [...s.requests, ...reqs] })),
      updateStatus: (id, status) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      clear: () => set({ requests: [] }),
    }),
    { name: 'stellarpay-requests' }
  )
);
```

### File: `src/components/requests/RequestInbox.tsx`

```tsx
import { useRequestStore } from '../../store/requestStore';
import { RequestCard } from './RequestCard';
import { Inbox } from 'lucide-react';

export function RequestInbox() {
  const { requests } = useRequestStore();
  const pending = requests.filter((r) => r.status === 'pending');

  if (pending.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((req) => (
        <RequestCard key={req.id} request={req} />
      ))}
    </div>
  );
}
```

### File: `src/components/requests/RequestCard.tsx`

```tsx
import { useState } from 'react';
import { Send, X, QrCode } from 'lucide-react';
import { PaymentRequest } from '../../types';
import { useRequestStore } from '../../store/requestStore';
import { useSendPayment } from '../../hooks/useSendPayment';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';

interface Props { request: PaymentRequest; }

export function RequestCard({ request }: Props) {
  const { updateStatus } = useRequestStore();
  const { sendPayment, loading } = useSendPayment();
  const [showQR, setShowQR] = useState(false);

  const pay = async () => {
    try {
      await sendPayment(request.toAddress, request.amount, request.memo);
      updateStatus(request.id, 'paid');
      toast.success(`Paid ${request.amount} XLM to ${request.from}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const reject = () => {
    updateStatus(request.id, 'rejected');
    toast('Request rejected');
  };

  const appUrl = import.meta.env.VITE_APP_URL;
  const qrValue = `${appUrl}/pay?address=${request.toAddress}&amount=${request.amount}&memo=${encodeURIComponent(request.memo ?? '')}`;

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {request.from} requests
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{request.memo}</p>
        </div>
        <span className="text-lg font-bold text-violet-600">{request.amount} XLM</span>
      </div>

      {showQR && (
        <div className="flex justify-center py-2">
          <QRCode value={qrValue} size={120} fgColor="#7C3AED" />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowQR((v) => !v)}
          className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
        >
          <QrCode className="w-4 h-4" />
        </button>
        <button
          onClick={reject}
          className="flex-1 flex items-center justify-center gap-1 border border-red-200 text-red-500 py-2 rounded-xl text-sm hover:bg-red-50"
        >
          <X className="w-3.5 h-3.5" /> Reject
        </button>
        <button
          onClick={pay}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Pay
        </button>
      </div>
    </div>
  );
}
```

---

## Page: Dashboard

### File: `src/pages/Dashboard.tsx`

```tsx
import { useState } from 'react';
import { Wallet, Send, Calculator, QrCode, Inbox } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useBalance } from '../hooks/useBalance';
import { WalletConnect } from '../components/wallet/WalletConnect';
import { WalletInfo } from '../components/wallet/WalletInfo';
import { SendForm } from '../components/send/SendForm';
import { BillSplitter } from '../components/split/BillSplitter';
import { QRGenerator } from '../components/qr/QRGenerator';
import { RequestInbox } from '../components/requests/RequestInbox';
import { useRequestStore } from '../store/requestStore';

const TABS = [
  { id: 'send', label: 'Send', icon: Send },
  { id: 'split', label: 'Split Bill', icon: Calculator },
  { id: 'qr', label: 'My QR', icon: QrCode },
  { id: 'requests', label: 'Requests', icon: Inbox },
];

export function Dashboard() {
  const { isConnected } = useWalletStore();
  const { requests } = useRequestStore();
  const [activeTab, setActiveTab] = useState('send');
  useBalance();

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10 text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
          <p className="text-gray-500 mt-2 max-w-xs">
            Connect your Freighter wallet to start sending XLM and splitting bills.
          </p>
        </div>
        <WalletConnect />
        <p className="text-xs text-gray-400">Running on Stellar Testnet</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <WalletInfo />

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mt-6 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
              activeTab === tab.id
                ? 'bg-white text-violet-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.id === 'requests' && pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {activeTab === 'send' && <SendForm />}
        {activeTab === 'split' && <BillSplitter />}
        {activeTab === 'qr' && <QRGenerator />}
        {activeTab === 'requests' && <RequestInbox />}
      </div>
    </div>
  );
}
```

---

## Page: Public Pay Page

### File: `src/pages/PayPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SendForm } from '../components/send/SendForm';
import { useSendPayment } from '../hooks/useSendPayment';
import { WalletConnect } from '../components/wallet/WalletConnect';
import { useWalletStore } from '../store/walletStore';

export function PayPage() {
  const [params] = useSearchParams();
  const address = params.get('address') ?? '';
  const amount = params.get('amount') ?? '';
  const memo = params.get('memo') ?? '';
  const { isConnected } = useWalletStore();
  const { sendPayment, result, loading } = useSendPayment();

  const handlePay = async () => {
    if (address && amount) {
      await sendPayment(address, amount, memo || undefined);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h2 className="font-bold text-gray-900">StellarPay Request</h2>
          {amount && (
            <p className="text-3xl font-bold text-violet-600 mt-2">{amount} XLM</p>
          )}
          {memo && <p className="text-sm text-gray-500 mt-1">{memo}</p>}
        </div>

        {isConnected ? (
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-violet-600 text-white py-3 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : `Pay ${amount} XLM`}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500">Connect your wallet to pay</p>
            <WalletConnect />
          </div>
        )}

        {result?.status === 'success' && (
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-green-700 font-medium text-sm">Payment successful!</p>
            <p className="text-xs text-green-600 font-mono mt-1 truncate">{result.hash}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## App Router

### File: `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { PayPage } from './pages/PayPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout><Landing /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/pay" element={<PayPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Stellar SDK Utilities

### File: `src/utils/stellar.ts`

```typescript
import { Horizon, StrKey } from '@stellar/stellar-sdk';

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL;
export const server = new Horizon.Server(HORIZON_URL);

export function isValidStellarAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatXLM(balance: string): string {
  const num = parseFloat(balance);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(num);
}
```

---

## README Template

```markdown
# StellarPay – Smart Bill Splitting & QR Payments on Stellar

> Split bills, send payment requests, and pay instantly using QR codes on Stellar.

## Features
- ✅ Freighter Wallet Connect / Disconnect
- ✅ Real-time XLM Balance Display
- ✅ Send XLM on Testnet with success/failure feedback
- ✅ Transaction Hash Display + Explorer Link
- ✅ Bill Splitter (Equal & Custom)
- ✅ Payment Request Creation
- ✅ Personal QR Code Generator
- ✅ Shareable Payment Links

## Tech Stack
React 18 · TypeScript · Vite · Tailwind CSS · Stellar SDK · Freighter API · qrcode.react · Zustand

## Setup

### Prerequisites
- Node.js 18+
- Freighter wallet extension installed in browser
- Freighter set to Testnet

### Install & Run
git clone https://github.com/your-username/stellarpay
cd stellarpay
npm install
cp .env.example .env
npm run dev

### Get Testnet XLM
Visit https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY

## Screenshots
[Add: wallet connected, balance shown, send form, split result, QR code, transaction success]

## Live Demo
https://stellarpay.vercel.app

## Network
Stellar Testnet (Horizon: https://horizon-testnet.stellar.org)
```

---

## package.json

```json
{
  "name": "stellarpay",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
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
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.0"
  }
}
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo on vercel.com
3. Add environment variables from `.env`
4. Deploy — done

Or deploy with CLI:
```bash
npm i -g vercel
vercel --prod
```

---

## White Belt Checklist

| Requirement | Status |
|---|---|
| Freighter wallet connect | ✅ |
| Wallet disconnect | ✅ |
| XLM balance display | ✅ |
| Send XLM on testnet | ✅ |
| Transaction success/failure state | ✅ |
| Transaction hash shown | ✅ |
| Public GitHub repo | ✅ |
| README with screenshots | ✅ |
| **Bonus: QR code generator** | ✅ |
| **Bonus: Payment links** | ✅ |
| **Bonus: Bill splitter** | ✅ |
| **Bonus: Payment requests** | ✅ |

---

## Build Order for Codex

Give these tasks to Codex in this order:

1. `Setup Vite + React + TypeScript + Tailwind project`
2. `Install all dependencies from package.json`
3. `Create all types in src/types/index.ts`
4. `Create Zustand stores: walletStore, requestStore, splitStore`
5. `Create utility functions in src/utils/stellar.ts`
6. `Implement useWallet hook`
7. `Implement useBalance hook`
8. `Implement useSendPayment hook`
9. `Build WalletConnect and WalletInfo components`
10. `Build SendForm and TransactionResult components`
11. `Build BillSplitter and SplitResult components`
12. `Build QRGenerator component`
13. `Build RequestCard and RequestInbox components`
14. `Build Navbar and Layout`
15. `Build Landing page`
16. `Build Dashboard page with tab navigation`
17. `Build PayPage (public QR payment landing)`
18. `Wire up App.tsx with react-router-dom`
19. `Test all features on Stellar Testnet`
20. `Deploy to Vercel`
```
