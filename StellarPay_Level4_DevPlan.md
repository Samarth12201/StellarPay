# StellarPay — Level 4 Green Belt: Complete Dev Plan
## Anchor-Powered Cross-Border Group Payments | Production MVP + 10 Real Users

---

## What Level 4 Adds to StellarPay

| Dimension | Level 3 (done) | Level 4 (this plan) |
|---|---|---|
| Users | Developer demo | 10 real testnet users |
| Currency | XLM only | XLM + USDC (Circle stablecoin) |
| Anchor | None | SEP-24 off-ramp (MoneyGram testnet) |
| Onboarding | Requires Freighter | Group invite links, no wallet needed to join |
| User profiles | None | Username + preferred currency + avatar |
| FX rates | None | Live USD/INR/MXN/PHP rates via CoinGecko API |
| Settlement display | XLM amounts | XLM + fiat equivalent side-by-side |
| Mobile | Responsive | Full PWA — installable on phone |
| Supabase RLS | None | Row Level Security — users see only their groups |

---

## Tech Stack Additions (on top of existing Level 3 stack)

| Tool | Purpose | Install |
|---|---|---|
| `@stellar/sep-24` | SEP-24 interactive withdrawal standard | `npm i @stellar/stellar-sdk` (built-in) |
| `@tanstack/react-query` | FX rate polling + anchor status polling | `npm i @tanstack/react-query` |
| `react-hook-form` | Profile + onboarding forms | `npm i react-hook-form` |
| `zod` | Form validation schemas | `npm i zod @hookform/resolvers` |
| `vite-plugin-pwa` | PWA manifest + service worker | `npm i -D vite-plugin-pwa` |
| `workbox-window` | PWA update prompts | included with vite-plugin-pwa |

**FX Rate API:** `https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,inr,mxn,php`
**USDC on Stellar Testnet:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
**MoneyGram SEP-24 anchor testnet:** `https://extstellar.moneygram.com`
**SEP-24 docs:** `https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md`

---

## Folder Structure (additions only)

```
src/
├── pages/
│   ├── Onboarding.tsx         ← NEW: 4-step first-time user setup
│   ├── Profile.tsx            ← NEW: username, preferred currency, avatar
│   ├── GroupInvite.tsx        ← NEW: /invite/:code — join group without wallet
│   └── AnchorWithdraw.tsx     ← NEW: SEP-24 off-ramp flow
├── components/
│   ├── onboarding/
│   │   ├── StepWallet.tsx     ← Step 1: connect wallet
│   │   ├── StepProfile.tsx    ← Step 2: set username + currency
│   │   ├── StepGroup.tsx      ← Step 3: create or join a group
│   │   └── StepDone.tsx       ← Step 4: success + first group tour
│   ├── profile/
│   │   └── ProfileCard.tsx    ← avatar, username, balance, preferred currency
│   ├── anchor/
│   │   ├── AnchorWidget.tsx   ← SEP-24 iframe modal
│   │   ├── WithdrawStatus.tsx ← polling pending/processing/complete states
│   │   └── AnchorInfo.tsx     ← what is an anchor? explainer card
│   ├── usdc/
│   │   ├── USDCBalance.tsx    ← show USDC balance alongside XLM
│   │   └── USDCSettle.tsx     ← pay settlement in USDC
│   ├── fx/
│   │   └── FXBadge.tsx        ← "≈ ₹412" badge next to XLM amounts
│   └── groups/
│       └── InviteButton.tsx   ← copy shareable invite link
├── hooks/
│   ├── useFXRates.ts          ← NEW: CoinGecko poll every 60s
│   ├── useUSDCBalance.ts      ← NEW: fetch USDC trustline balance
│   ├── useSEP24.ts            ← NEW: full SEP-24 withdrawal flow
│   ├── useInviteLink.ts       ← NEW: generate + accept invite links
│   └── useProfile.ts          ← NEW: load/save user profile from Supabase
├── services/
│   ├── anchorService.ts       ← NEW: SEP-10 auth + SEP-24 flow
│   ├── fxService.ts           ← NEW: CoinGecko fetch + cache
│   └── usdcService.ts         ← NEW: USDC trustline + balance
├── lib/
│   └── supabase.ts            ← existing, add RLS context
└── constants/
    └── assets.ts              ← USDC contract, anchor URL, currencies
```

---

## New Supabase Tables

Run these in your Supabase SQL editor:

```sql
-- User profiles
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,                    -- Stellar address (G...)
  username TEXT UNIQUE NOT NULL,
  preferred_currency TEXT DEFAULT 'USD',  -- USD | INR | MXN | PHP
  avatar_color TEXT DEFAULT '#7C3AED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group invite links
CREATE TABLE group_invitations (
  id TEXT PRIMARY KEY,                    -- nanoid()
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,       -- 8-char code e.g. "goa-25ab"
  created_by TEXT NOT NULL,              -- Stellar address of creator
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 10,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEP-24 withdrawal tracking
CREATE TABLE anchor_withdrawals (
  id TEXT PRIMARY KEY,                    -- SEP-24 transaction ID from anchor
  user_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,                   -- 'USDC' | 'XLM'
  anchor_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|complete|error
  stellar_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read invites" ON group_invitations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create invites" ON group_invitations FOR INSERT WITH CHECK (true);

ALTER TABLE anchor_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own withdrawals" ON anchor_withdrawals FOR ALL USING (user_address = auth.uid()::text);
```

---

## Part 1 — Constants

### `src/constants/assets.ts`

```typescript
// USDC on Stellar Testnet (Circle)
export const USDC_TESTNET = {
  code: 'USDC',
  issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
};

// MoneyGram SEP-24 anchor (testnet)
export const MGI_ANCHOR = {
  homeDomain: 'extstellar.moneygram.com',
  tomlUrl: 'https://extstellar.moneygram.com/.well-known/stellar.toml',
  sep10Url: 'https://extstellar.moneygram.com/stellartoml/sep10',
  sep24Url: 'https://extstellar.moneygram.com/stellartoml/sep24',
};

// Supported display currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$',  flag: '🇺🇸', name: 'US Dollar' },
  { code: 'INR', symbol: '₹',  flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$',flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'PHP', symbol: '₱',  flag: '🇵🇭', name: 'Philippine Peso' },
  { code: 'EUR', symbol: '€',  flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£',  flag: '🇬🇧', name: 'British Pound' },
];

export const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,inr,mxn,php,eur,gbp';
```

---

## Part 2 — FX Rates Hook

### `src/hooks/useFXRates.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

interface FXRates {
  usd: number; inr: number; mxn: number;
  php: number; eur: number; gbp: number;
}

async function fetchRates(): Promise<FXRates> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,inr,mxn,php,eur,gbp'
  );
  const data = await res.json();
  return data.stellar as FXRates;
}

export function useFXRates() {
  const { data, isLoading } = useQuery({
    queryKey: ['fx-rates'],
    queryFn: fetchRates,
    refetchInterval: 60_000,      // refresh every 60 seconds
    staleTime: 55_000,
    retry: 3,
    placeholderData: { usd: 0.12, inr: 10.0, mxn: 2.1, php: 6.8, eur: 0.11, gbp: 0.09 },
  });
  return { rates: data, isLoading };
}

// Convert XLM amount to local fiat string
export function xlmToFiat(
  xlmAmount: number,
  currency: string,
  rates: FXRates | undefined
): string {
  if (!rates) return '';
  const rate = rates[currency.toLowerCase() as keyof FXRates] ?? 0;
  const fiat = xlmAmount * rate;
  const symbols: Record<string, string> = {
    USD: '$', INR: '₹', MXN: 'MX$', PHP: '₱', EUR: '€', GBP: '£',
  };
  return `≈ ${symbols[currency] ?? ''}${fiat.toFixed(2)} ${currency}`;
}
```

---

## Part 3 — USDC Balance Hook

### `src/hooks/useUSDCBalance.ts`

```typescript
import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { USDC_TESTNET } from '../constants/assets';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL);

export function useUSDCBalance(address: string | null) {
  const [balance, setBalance] = useState<string | null>(null);
  const [hasTrustline, setHasTrustline] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    server.loadAccount(address)
      .then((account) => {
        const usdcBalance = account.balances.find(
          (b) =>
            b.asset_type === 'credit_alphanum4' &&
            (b as any).asset_code === USDC_TESTNET.code &&
            (b as any).asset_issuer === USDC_TESTNET.issuer
        );
        if (usdcBalance) {
          setBalance(usdcBalance.balance);
          setHasTrustline(true);
        } else {
          setBalance('0');
          setHasTrustline(false);
        }
      })
      .catch(() => { setBalance(null); })
      .finally(() => setLoading(false));
  }, [address]);

  return { balance, hasTrustline, loading };
}
```

---

## Part 4 — SEP-24 Anchor Service

### `src/services/anchorService.ts`

```typescript
import { Networks, Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

// Step 1: SEP-10 — get JWT auth token from anchor
export async function getAnchorToken(
  address: string,
  signXdr: (xdr: string) => Promise<string>
): Promise<string> {
  // GET /auth?account=G...
  const challengeRes = await fetch(
    `https://extstellar.moneygram.com/stellartoml/sep10/auth?account=${address}`
  );
  const { transaction } = await challengeRes.json();

  // Sign the challenge transaction
  const signedXdr = await signXdr(transaction);

  // POST /auth with signed tx
  const tokenRes = await fetch(
    'https://extstellar.moneygram.com/stellartoml/sep10/auth',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: signedXdr }),
    }
  );
  const { token } = await tokenRes.json();
  return token as string;
}

// Step 2: SEP-24 — start interactive withdrawal, get iframe URL
export async function startWithdrawal(
  token: string,
  asset: 'XLM' | 'USDC',
  amount: string
): Promise<{ url: string; id: string }> {
  const res = await fetch(
    'https://extstellar.moneygram.com/stellartoml/sep24/transactions/withdraw/interactive',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ asset_code: asset, amount }),
    }
  );
  const data = await res.json();
  return { url: data.url, id: data.id };
}

// Step 3: Poll transaction status
export async function getWithdrawalStatus(
  token: string,
  transactionId: string
): Promise<{ status: string; stellar_transaction_id?: string }> {
  const res = await fetch(
    `https://extstellar.moneygram.com/stellartoml/sep24/transaction?id=${transactionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return {
    status: data.transaction?.status ?? 'unknown',
    stellar_transaction_id: data.transaction?.stellar_transaction_id,
  };
}
```

---

## Part 5 — SEP-24 Hook

### `src/hooks/useSEP24.ts`

```typescript
import { useState, useCallback } from 'react';
import { useWalletStore } from '../store/walletStore';
import { useWallet } from './useWallet';
import { supabase } from '../lib/supabase';
import { getAnchorToken, startWithdrawal, getWithdrawalStatus } from '../services/anchorService';

type WithdrawStep = 'idle' | 'auth' | 'opening' | 'waiting' | 'polling' | 'complete' | 'error';

export function useSEP24() {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const [step, setStep] = useState<WithdrawStep>('idle');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startWithdraw = useCallback(async (asset: 'XLM' | 'USDC', amount: string) => {
    if (!address) return;
    setError(null);
    try {
      // Step 1: authenticate with anchor
      setStep('auth');
      const token = await getAnchorToken(address, signXdr);

      // Step 2: get interactive URL
      setStep('opening');
      const { url, id } = await startWithdrawal(token, asset, amount);
      setIframeUrl(url);
      setTxId(id);
      setStep('waiting');

      // Save to Supabase for status tracking
      await supabase.from('anchor_withdrawals').upsert({
        id,
        user_address: address,
        amount,
        asset,
        anchor_url: url,
        status: 'pending',
      });

      // Step 3: Poll status every 5 seconds after iframe opens
      const poll = async () => {
        setStep('polling');
        const interval = setInterval(async () => {
          try {
            const { status, stellar_transaction_id } = await getWithdrawalStatus(token, id);
            setWithdrawStatus(status);

            await supabase
              .from('anchor_withdrawals')
              .update({ status, stellar_tx_hash: stellar_transaction_id ?? null })
              .eq('id', id);

            if (status === 'completed' || status === 'complete') {
              setStep('complete');
              clearInterval(interval);
            } else if (status === 'error' || status === 'expired') {
              setStep('error');
              clearInterval(interval);
            }
          } catch {
            // keep polling on transient errors
          }
        }, 5000);
        // Auto-stop after 10 minutes
        setTimeout(() => clearInterval(interval), 600_000);
      };
      // Start polling after 10 seconds (user completes KYC in iframe)
      setTimeout(poll, 10_000);
    } catch (err: any) {
      setError(err.message ?? 'Anchor connection failed');
      setStep('error');
    }
  }, [address, signXdr]);

  const reset = () => {
    setStep('idle');
    setIframeUrl(null);
    setTxId(null);
    setWithdrawStatus(null);
    setError(null);
  };

  return { step, iframeUrl, txId, withdrawStatus, error, startWithdraw, reset };
}
```

---

## Part 6 — Profile Hook

### `src/hooks/useProfile.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWalletStore } from '../store/walletStore';

export interface UserProfile {
  id: string;             // Stellar address
  username: string;
  preferred_currency: string;
  avatar_color: string;
}

export function useProfile() {
  const { address } = useWalletStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', address)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as UserProfile);
          setIsNew(false);
        } else {
          setIsNew(true);  // trigger onboarding
        }
      })
      .finally(() => setLoading(false));
  }, [address]);

  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!address) return;
    const merged = { id: address, avatar_color: '#7C3AED', preferred_currency: 'USD', username: '', ...profile, ...updates };
    const { data } = await supabase.from('user_profiles').upsert(merged).select().single();
    if (data) setProfile(data as UserProfile);
    setIsNew(false);
  };

  return { profile, loading, isNew, saveProfile };
}
```

---

## Part 7 — Invite Link System

### `src/hooks/useInviteLink.ts`

```typescript
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';
import { useWalletStore } from '../store/walletStore';

export function useInviteLink() {
  const { address } = useWalletStore();

  const generateInvite = async (groupId: string): Promise<string> => {
    const code = nanoid(8);
    await supabase.from('group_invitations').insert({
      id: nanoid(),
      group_id: groupId,
      invite_code: code,
      created_by: address ?? '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
    const url = `${import.meta.env.VITE_APP_URL}/invite/${code}`;
    return url;
  };

  const acceptInvite = async (code: string, memberName: string, memberAddress: string) => {
    // Look up invite
    const { data: invite } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('invite_code', code)
      .single();

    if (!invite) throw new Error('Invite not found or expired');
    if (invite.use_count >= invite.max_uses) throw new Error('Invite link has reached its limit');
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Invite link has expired');

    // Add member to group
    const memberId = nanoid();
    await supabase.from('group_members').insert({
      id: memberId,
      group_id: invite.group_id,
      name: memberName,
      address: memberAddress,
      avatarColor: '#059669',
    });

    // Increment use count
    await supabase
      .from('group_invitations')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    return invite.group_id as string;
  };

  return { generateInvite, acceptInvite };
}
```

---

## Part 8 — FX Badge Component

### `src/components/fx/FXBadge.tsx`

```tsx
import { useFXRates, xlmToFiat } from '../../hooks/useFXRates';
import { useProfile } from '../../hooks/useProfile';

interface Props {
  xlmAmount: number;
  className?: string;
}

export function FXBadge({ xlmAmount, className = '' }: Props) {
  const { rates } = useFXRates();
  const { profile } = useProfile();
  const currency = profile?.preferred_currency ?? 'USD';
  const fiatStr = xlmToFiat(xlmAmount, currency, rates);

  if (!fiatStr) return null;

  return (
    <span className={`text-xs text-gray-400 font-medium ${className}`}>
      {fiatStr}
    </span>
  );
}
```

---

## Part 9 — Anchor Withdraw Page

### `src/pages/AnchorWithdraw.tsx`

```tsx
import { useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEP24 } from '../hooks/useSEP24';
import { useWalletStore } from '../store/walletStore';
import { useUSDCBalance } from '../hooks/useUSDCBalance';

const STEP_LABELS = {
  idle: null,
  auth: 'Authenticating with MoneyGram...',
  opening: 'Opening withdrawal form...',
  waiting: 'Complete the form in the window below',
  polling: 'Processing your withdrawal...',
  complete: 'Withdrawal complete!',
  error: 'Something went wrong',
};

export function AnchorWithdraw() {
  const navigate = useNavigate();
  const { address } = useWalletStore();
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { step, iframeUrl, withdrawStatus, error, startWithdraw, reset } = useSEP24();
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('USDC');
  const [amount, setAmount] = useState('');

  const isLoading = ['auth', 'opening'].includes(step);
  const isPolling = step === 'polling';
  const isDone = step === 'complete';
  const isError = step === 'error';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Withdraw to Bank</h1>
          <p className="text-sm text-gray-400">Powered by MoneyGram · SEP-24</p>
        </div>
      </div>

      {/* Anchor explainer card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">What is this?</p>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            MoneyGram is a Stellar Anchor — it converts your XLM or USDC into local fiat currency
            and deposits it into your bank account or mobile wallet. Available in 200+ countries.
          </p>
        </div>
      </div>

      {step === 'idle' && (
        <div className="space-y-4">
          {/* Asset selector */}
          <div>
            <label className="block text-sm font-semibold mb-2">Withdraw asset</label>
            <div className="flex gap-2">
              {(['USDC', 'XLM'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    asset === a
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {a === 'USDC' ? '💵 USDC' : '⭐ XLM'}
                  {a === 'USDC' && usdcBalance && (
                    <span className="block text-xs font-normal mt-0.5 opacity-80">
                      Balance: {parseFloat(usdcBalance).toFixed(2)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Amount</label>
            <div className="flex border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
              <span className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-500 border-r border-gray-300">
                {asset}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          {/* Fees notice */}
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex items-start gap-2">
            <span>ℹ️</span>
            <span>MoneyGram charges a small fee for off-ramp services. Stellar network fee: &lt;$0.01. Funds typically arrive within 1–3 business days.</span>
          </div>

          <button
            onClick={() => startWithdraw(asset, amount)}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40"
          >
            Continue to MoneyGram →
          </button>
        </div>
      )}

      {/* Loading states */}
      {isLoading && (
        <div className="flex flex-col items-center py-12 gap-4 text-center">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-sm font-medium text-gray-700">{STEP_LABELS[step]}</p>
        </div>
      )}

      {/* SEP-24 iframe */}
      {step === 'waiting' && iframeUrl && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">{STEP_LABELS[step]}</p>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <iframe
              src={iframeUrl}
              className="w-full"
              style={{ height: '560px' }}
              title="MoneyGram Withdrawal"
            />
          </div>
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-violet-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </a>
        </div>
      )}

      {/* Polling status */}
      {isPolling && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-blue-800">Processing withdrawal</p>
            <p className="text-xs text-blue-600">
              Status: <span className="font-medium capitalize">{withdrawStatus ?? 'pending'}</span>
            </p>
            <p className="text-xs text-blue-500">We'll update this automatically. You can leave and come back.</p>
          </div>
        </div>
      )}

      {/* Complete */}
      {isDone && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <p className="text-lg font-bold text-green-800">Withdrawal Complete!</p>
          <p className="text-sm text-green-600">
            Your funds are on their way. Check your bank account in 1–3 business days.
          </p>
          <button onClick={reset} className="mt-2 text-sm text-violet-600 hover:underline">
            Make another withdrawal
          </button>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-red-800">Withdrawal failed</p>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={reset} className="text-sm text-violet-600 hover:underline">Try again</button>
        </div>
      )}
    </div>
  );
}
```

---

## Part 10 — Onboarding Flow

### `src/pages/Onboarding.tsx`

4-step wizard shown to new users after wallet connect if no profile exists.

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useWalletStore } from '../store/walletStore';
import { CURRENCIES } from '../constants/assets';
import { CheckCircle } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const { address } = useWalletStore();
  const { saveProfile } = useProfile();
  const navigate = useNavigate();

  const handleSaveProfile = async () => {
    setSaving(true);
    await saveProfile({ username, preferred_currency: currency });
    setSaving(false);
    setStep(3);
  };

  const STEPS = [
    { num: 1, label: 'Wallet' },
    { num: 2, label: 'Profile' },
    { num: 3, label: 'Group' },
    { num: 4, label: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-violet-600 transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          {STEPS.map((s) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > s.num ? 'bg-green-500 text-white' :
                step === s.num ? 'bg-violet-600 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.num ? 'text-violet-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-4">

          {/* Step 1: Wallet connected confirmation */}
          {step === 1 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-3xl">🌟</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Wallet Connected!</h2>
                <p className="text-sm text-gray-500 mt-1">Welcome to StellarPay. Let's set up your profile.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-500 truncate">
                {address}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700"
              >
                Set up profile →
              </button>
            </div>
          )}

          {/* Step 2: Profile setup */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your profile</h2>
                <p className="text-sm text-gray-400 mt-0.5">Choose a display name and preferred currency</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Display name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Samarth, Aman, Priya"
                  maxLength={30}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-400 mt-1">This is how group members will see you</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Preferred currency</label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                        currency === c.code
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="mt-0.5">{c.code}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Settlement amounts will be displayed in {currency} alongside XLM
                </p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={!username.trim() || saving}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save & Continue →'}
              </button>
            </div>
          )}

          {/* Step 3: First group */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Profile saved!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Now create your first expense group or join one with an invite link.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/groups/new')}
                  className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700"
                >
                  Create a group
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="w-full border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50"
                >
                  I have an invite link
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Enter invite code */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Join a group</h2>
                <p className="text-sm text-gray-400 mt-0.5">Paste the invite link your friend shared</p>
              </div>
              <input
                type="text"
                placeholder="https://stellarpay.app/invite/abc12345"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700">
                Join group
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-gray-400 text-sm hover:text-gray-600"
              >
                Skip for now →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Part 11 — Group Invite Page

### `src/pages/GroupInvite.tsx`

This page works without a wallet — lets non-crypto users see the group and then connect to join.

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useInviteLink } from '../hooks/useInviteLink';
import { useWalletStore } from '../store/walletStore';
import { WalletConnect } from '../components/wallet/WalletConnect';
import { Loader2, Users } from 'lucide-react';

export function GroupInvite() {
  const { code } = useParams<{ code: string }>();
  const { address } = useWalletStore();
  const { acceptInvite } = useInviteLink();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    supabase
      .from('group_invitations')
      .select('*, groups(*)')
      .eq('invite_code', code)
      .single()
      .then(({ data }) => {
        if (data) {
          setInvite(data);
          setGroup(data.groups);
        }
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!address || !name.trim() || !code) return;
    setJoining(true);
    try {
      const groupId = await acceptInvite(code, name.trim(), address);
      navigate(`/groups/${groupId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-lg p-6 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">You're invited!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Join <span className="font-semibold text-gray-800">{group?.name ?? 'a group'}</span> on StellarPay
          </p>
        </div>

        {!address ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-500">
              Connect your Stellar wallet to join and pay your share of group expenses.
            </p>
            <WalletConnect />
            <p className="text-xs text-gray-400">
              Don't have a wallet? Install{' '}
              <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">
                Freighter
              </a>{' '}
              — it takes 2 minutes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Your display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aman, Priya"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!name.trim() || joining}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40"
            >
              {joining ? 'Joining...' : `Join ${group?.name ?? 'group'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Part 12 — Profile Page

### `src/pages/Profile.tsx`

```tsx
import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useWalletStore } from '../store/walletStore';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useFXRates, xlmToFiat } from '../hooks/useFXRates';
import { CURRENCIES } from '../constants/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export function Profile() {
  const navigate = useNavigate();
  const { address, balance } = useWalletStore();
  const { profile, saveProfile } = useProfile();
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { rates } = useFXRates();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [currency, setCurrency] = useState(profile?.preferred_currency ?? 'USD');

  const xlmFiat = xlmToFiat(parseFloat(balance ?? '0'), currency, rates);

  const copyAddress = () => {
    navigator.clipboard.writeText(address ?? '');
    toast.success('Address copied!');
  };

  const handleSave = async () => {
    await saveProfile({ username, preferred_currency: currency });
    setEditing(false);
    toast.success('Profile updated!');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
          style={{ background: profile?.avatar_color ?? '#7C3AED' }}
        >
          {(profile?.username ?? address ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{profile?.username ?? 'Unnamed'}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs font-mono text-gray-400 truncate max-w-[180px]">
              {address?.slice(0, 12)}…{address?.slice(-4)}
            </p>
            <button onClick={copyAddress} className="text-gray-400 hover:text-gray-600">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a
              href={`https://stellar.expert/explorer/testnet/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-violet-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <p className="text-xs text-violet-500 font-semibold">XLM Balance</p>
          <p className="text-xl font-bold text-violet-800 mt-0.5">{parseFloat(balance ?? '0').toFixed(2)}</p>
          <p className="text-xs text-violet-400 mt-0.5">{xlmFiat}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-500 font-semibold">USDC Balance</p>
          <p className="text-xl font-bold text-green-800 mt-0.5">
            {usdcBalance ? parseFloat(usdcBalance).toFixed(2) : '—'}
          </p>
          <p className="text-xs text-green-400 mt-0.5">Circle USDC</p>
        </div>
      </div>

      {/* Withdraw button */}
      <button
        onClick={() => navigate('/withdraw')}
        className="w-full flex items-center justify-center gap-2 border border-violet-200 text-violet-600 py-3 rounded-xl text-sm font-semibold hover:bg-violet-50"
      >
        🏦 Withdraw to Bank (MoneyGram)
      </button>

      {/* Edit profile */}
      {!editing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Preferred currency</p>
            <span className="text-sm text-gray-500">
              {CURRENCIES.find((c) => c.code === profile?.preferred_currency)?.flag}{' '}
              {profile?.preferred_currency ?? 'USD'}
            </span>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Edit profile
          </button>
        </div>
      ) : (
        <div className="space-y-4 border border-violet-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-800">Edit profile</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display name</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Preferred currency</label>
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-medium transition-all ${
                    currency === c.code ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Part 13 — UI Changes: Dashboard (FX + USDC + Invite)

### Updates to `src/pages/Dashboard.tsx`

```tsx
// 1. Add USDC balance row to WalletCard in sidebar
<div className="wallet-card">
  <div className="wc-label">XLM Balance</div>
  <div className="wc-balance">{parseFloat(balance ?? '0').toFixed(2)}</div>
  {/* NEW: FX equivalent */}
  <div className="text-xs text-violet-200 mt-0.5">
    <FXBadge xlmAmount={parseFloat(balance ?? '0')} />
  </div>
  {/* NEW: USDC balance */}
  {usdcBalance && parseFloat(usdcBalance) > 0 && (
    <div className="mt-2 bg-white/10 rounded-lg px-2 py-1.5">
      <span className="text-xs text-violet-100">USDC: {parseFloat(usdcBalance).toFixed(2)}</span>
    </div>
  )}
  <div className="wc-addr">{address?.slice(0, 8)}...{address?.slice(-4)}</div>
  <div className="wc-net">Testnet</div>
</div>

// 2. Add "Withdraw to Bank" button below wallet card in sidebar
<button onClick={() => navigate('/withdraw')}
  className="w-full flex items-center gap-2 text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl py-2 px-3 hover:border-violet-300 hover:text-violet-600 mt-2">
  🏦 Withdraw to Bank
</button>

// 3. Add Profile nav item
<div className="snav-item" onClick={() => navigate('/profile')}>
  <span className="icon">👤</span> Profile
</div>

// 4. In Settlement panel — show FX beside every amount
// Wrap each amount display:
<span>{settlement.amount} XLM</span>
<FXBadge xlmAmount={settlement.amount} className="ml-1.5" />
```

---

## Part 14 — UI Changes: GroupDetail (Invite button + FX)

```tsx
// Add Invite button in Group header
<button
  onClick={async () => {
    const url = await generateInvite(group.id);
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied! Share it with your group members.');
  }}
  className="flex items-center gap-1.5 border border-violet-200 text-violet-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-violet-50"
>
  🔗 Invite
</button>

// In expense list — show share per person in FX
<p className="text-xs text-gray-400">
  {share.toFixed(2)} XLM each
  <FXBadge xlmAmount={parseFloat(share.toFixed(2))} className="ml-1.5" />
</p>

// In SettlementView — show FX beside amount
<div className="text-right">
  <p className="text-lg font-bold text-gray-900">{s.amount} XLM</p>
  <FXBadge xlmAmount={s.amount} />
</div>
```

---

## Part 15 — App Router Updates

### `src/App.tsx` — add new routes

```tsx
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { GroupInvite } from './pages/GroupInvite';
import { AnchorWithdraw } from './pages/AnchorWithdraw';
import { useProfile } from './hooks/useProfile';
import { useWalletStore } from './store/walletStore';

// Inside App component — redirect new users to onboarding
function AppRoutes() {
  const { isConnected } = useWalletStore();
  const { isNew, loading } = useProfile();

  // Show onboarding for first-time wallet users
  if (isConnected && !loading && isNew) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <Routes>
      <Route path="/"             element={<Layout><Landing /></Layout>} />
      <Route path="/dashboard"    element={<Layout><Dashboard /></Layout>} />
      <Route path="/groups/:groupId" element={<Layout><GroupDetail /></Layout>} />
      <Route path="/groups/new"   element={<Layout><CreateGroupPage /></Layout>} />
      <Route path="/profile"      element={<Layout><Profile /></Layout>} />
      <Route path="/withdraw"     element={<Layout><AnchorWithdraw /></Layout>} />
      <Route path="/onboarding"   element={<Onboarding />} />
      <Route path="/invite/:code" element={<GroupInvite />} />
      <Route path="/pay"          element={<PayPage />} />
    </Routes>
  );
}
```

---

## Part 16 — PWA Setup

### `vite.config.ts` additions

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'StellarPay',
        short_name: 'StellarPay',
        description: 'Split bills & settle with XLM',
        theme_color: '#7C3AED',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
});
```

Add `public/icon-192.png` and `public/icon-512.png` — violet background, white "S" letter.

---

## Part 17 — Environment Variables

```env
# .env additions for Level 4
VITE_MGI_ANCHOR_URL=https://extstellar.moneygram.com
VITE_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
VITE_COINGECKO_URL=https://api.coingecko.com/api/v3/simple/price
```

---

## Part 18 — 10+ Git Commits Plan

```bash
# 1 — New types, constants, env vars
git commit -m "feat: add USDC, anchor, FX rate constants and currency types"

# 2 — Supabase tables (user_profiles, invitations, withdrawals, RLS)
git commit -m "feat: add Supabase tables for profiles, invites, anchor withdrawals with RLS"

# 3 — FX rates hook + FXBadge component
git commit -m "feat: add CoinGecko FX rate polling and FXBadge component"

# 4 — USDC balance hook
git commit -m "feat: add USDC trustline balance hook"

# 5 — User profile system (hook + Profile page)
git commit -m "feat: add user profile system with username and preferred currency"

# 6 — Onboarding flow (4-step wizard)
git commit -m "feat: add 4-step onboarding flow for new wallet users"

# 7 — Group invite link system
git commit -m "feat: add group invite links — share URL, join without wallet first"

# 8 — GroupInvite page (/invite/:code)
git commit -m "feat: add public invite page — join group via link with display name"

# 9 — SEP-24 anchor service + useSEP24 hook
git commit -m "feat: add SEP-10 auth and SEP-24 interactive withdrawal flow"

# 10 — AnchorWithdraw page (full UI)
git commit -m "feat: add anchor withdrawal page with iframe, status polling, success/error states"

# 11 — Dashboard: FX badges, USDC balance, withdraw button, profile nav
git commit -m "feat: update dashboard with FX display, USDC balance, anchor withdraw link"

# 12 — GroupDetail: invite button, FX in settlements and expenses
git commit -m "feat: add invite button and FX amounts to group detail and settlement view"

# 13 — PWA setup (vite-plugin-pwa, manifest, icons)
git commit -m "feat: add PWA manifest and service worker for mobile install"

# 14 — Router: new routes, onboarding redirect
git commit -m "feat: add routes for profile, withdraw, onboarding, invite pages"

# 15 — README Level 4 section
git commit -m "docs: update README with Level 4 features, anchor info, user onboarding guide"
```

---

## Level 4 Submission Checklist

| Requirement | How it's met |
|---|---|
| Production MVP | Full app on Vercel, all features working end-to-end |
| 10 real testnet users | Invite link system removes wallet barrier; onboarding guides new users |
| Anchor integration | MoneyGram SEP-24 off-ramp working in AnchorWithdraw page |
| USDC support | USDC balance shown, withdraw in USDC via anchor |
| User profiles | Username + preferred currency + avatar per wallet address |
| FX rate display | Live CoinGecko rates, every XLM amount shows fiat equivalent |
| Mobile PWA | Installable on phone, offline-capable with Workbox |
| Group invite links | `/invite/:code` page — no wallet needed to see the group |
| Supabase RLS | Row Level Security on all new tables |
| 10+ commits | 15 scoped commits planned above |
| Live demo | Deployed on Vercel, same URL as Level 3 |
| README updated | Anchor section, invite guide, user onboarding screenshots |
```
