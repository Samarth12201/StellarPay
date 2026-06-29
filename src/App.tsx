import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { Asset, BASE_FEE, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { nanoid } from 'nanoid';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Inbox,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  Wallet,
  FileCode,
  Radio,
  Users,
  Gift
} from 'lucide-react';
import { useRequestStore, useWalletStore } from './store';
import type { Participant, PaymentRequest, TransactionResult } from './types';
import { formatXlm, isValidStellarAddress, server, truncateAddress } from './utils';
import { useGroupStore } from './store/groupStore';

import { useWallet } from './hooks/useWallet';
import { useSendPayment, getFreighterError } from './hooks/useSendPayment';
import { useContract } from './hooks/useContract';
import { WalletConnect } from './components/wallet/WalletConnect';
import { TxStatusBar } from './components/tx/TxStatusBar';
import { EventFeed } from './components/events/EventFeed';
import { GroupPage } from './pages/GroupPage';
import { PoolsPage } from './pages/PoolsPage';
import { MobileNav } from './components/layout/MobileNav';
import { RequestInbox } from './components/requests/RequestInbox';
import { CONTRACT_ADDRESS } from './constants/contract';
import { useRealtimeRequests } from './hooks/useRealtimeRequests';
import { useRealtimeGroups } from './hooks/useRealtimeGroups';
import { ContractRequests } from './components/contract/ContractRequests';

function useBalance() {
  const { address, setBalance } = useWalletStore();
  const { syncFromSupabase: syncGroups } = useGroupStore();
  const { syncFromSupabase: syncRequests } = useRequestStore();

  useEffect(() => {
    // Initial Supabase Sync
    if (address) {
      syncGroups();
      syncRequests(address);
    }

    let cancelled = false;
    async function loadBalance() {
      if (!address) return;
      try {
        const account = await server.loadAccount(address);
        const native = account.balances.find((balance) => balance.asset_type === 'native');
        if (!cancelled) setBalance(native?.balance ?? '0');
      } catch {
        if (!cancelled) setBalance('0');
      }
    }

    loadBalance();
    const timer = window.setInterval(() => {
      loadBalance();
      // Only syncing requests periodically since groups are fully real-time now
      if (address) {
        syncRequests(address);
      }
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, setBalance, syncGroups, syncRequests]);
}

function Navbar() {
  const navigate = useNavigate();
  const { isConnected } = useWalletStore();
  return (
    <nav className="nav">
      <Link to="/" className="logo"><span className="logoIcon">S</span>StellarPay</Link>
      <div className="navLinks">
        <a href="/#features">Features</a>
        <a href="/#how">How it works</a>
        <a href="https://friendbot.stellar.org/" target="_blank" rel="noreferrer">Friendbot</a>
      </div>
      <div className="navCta">
        <span className="badgeNet">● Testnet</span>
        <button className="btn ghost" onClick={() => navigate('/')}>Home</button>
        {isConnected ? (
          <button className="btn primary" onClick={() => navigate('/dashboard')}>Dashboard →</button>
        ) : (
          <WalletConnect label="Connect Wallet" />
        )}
      </div>
    </nav>
  );
}



function WalletInfo() {
  const navigate = useNavigate();
  const { address, balance } = useWalletStore();
  const { disconnect } = useWallet();

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <div className="walletCard">
      <div>
        <div className="wcLabel">XLM Balance</div>
        <div className="wcBalance">{formatXlm(balance)}</div>
        <span className="wcAddr">{address ? truncateAddress(address) : 'Not connected'}</span>
        <span className="wcNet">Testnet</span>
      </div>
      <button className="disconnect" onClick={handleDisconnect}>Disconnect</button>
    </div>
  );
}

function Landing() {
  const { isConnected } = useWalletStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) navigate('/dashboard');
  }, [isConnected, navigate]);

  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="heroBadge"><Sparkles size={14} /> Built on Stellar · White Belt Submission</div>
          <h1>Split bills & send <span>XLM payments</span> in seconds.</h1>
          <p>StellarPay combines wallet payments, QR codes, bill splitting, and payment requests into one clean Stellar Testnet app.</p>
          <div className="heroActions">
            <WalletConnect label="Connect Wallet" className="large" />
            <a className="btn ghost large" href="#how">See how it works</a>
          </div>
        </section>

        <section id="features" className="featuresGrid">
          {[
            ['🔗', 'Wallet Connect', 'Connect Freighter and view your live XLM balance.'],
            ['⚡', 'Send XLM', 'Submit real Stellar Testnet payments with explorer links.'],
            ['🧮', 'Bill Splitting', 'Split equally or by custom amounts and request payment.'],
            ['📬', 'Requests Inbox', 'Track pending, paid, and rejected requests locally.'],
            ['🔎', 'Explorer Ready', 'Every successful transaction links to Stellar Expert.'],
          ].map(([icon, title, copy]) => (
            <article className="featCard" key={title}>
              <div className="featIcon">{icon}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <section id="how" className="steps">
          <div className="sectionLabel">How it works</div>
          <h2>From dinner to settled in 4 steps</h2>
          <div className="stepsRow">
            {['Connect Wallet', 'Add the Bill', 'Split & Request', 'Everyone Pays'].map((step, index) => (
              <div className="step" key={step}>
                <span>{index + 1}</span>
                <h4>{step}</h4>
                <p>{['Freighter on Testnet', 'Enter total & people', 'Generate requests', 'One click, on-chain'][index]}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function SendForm({
  preset,
  onSuccess
}: {
  preset?: { to?: string; amount?: string; memo?: string };
  onSuccess?: (txHash: string) => void;
}) {
  const [to, setTo] = useState(preset?.to ?? '');
  const [amount, setAmount] = useState(preset?.amount ?? '');
  const [memo, setMemo] = useState(preset?.memo ?? '');

  const { sendPayment, loading, result, error, reset } = useSendPayment();

  const handleReset = () => {
    reset();
    setTo('');
    setAmount('');
    setMemo('');
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const tx = await sendPayment(to, amount, memo || undefined);
      toast.success('Payment sent!');
      if (onSuccess && tx) {
        onSuccess(tx.hash);
      }
    } catch (error) {
      toast.error(getFreighterError(error, 'Payment failed.'));
    }
  }

  if (result) {
    return (
      <div className="successBox">
        <CheckCircle2 size={42} />
        <h3>Payment Sent!</h3>
        <p>{result.amount} XLM to {truncateAddress(result.to)}</p>
        <code>{result.hash}</code>
        <div className="row flex gap-2 mt-2">
          <a className="btn ghost flex-1 flex items-center justify-center gap-1.5" href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Explorer</a>
          <button className="btn primary flex-1" onClick={handleReset}>Send Again</button>
        </div>
      </div>
    );
  }

  return (
    <form className="form space-y-3" onSubmit={submit}>
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Recipient Address</span>
        <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="G... (Stellar public key)" className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 outline-none focus:border-violet-500" required />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Amount (XLM)</span>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.0000001" step="0.0000001" placeholder="0.00" className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 outline-none focus:border-violet-500" required />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Memo <span className="text-xs text-gray-400 font-normal">(optional, max 28 chars)</span></span>
        <input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={28} placeholder="e.g. Dinner split" className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 outline-none focus:border-violet-500" />
      </label>
      {error && <div className="error text-red-500 text-sm flex items-center gap-1.5 mt-2"><AlertCircle size={16} />{error}</div>}
      <button className="btn primary full w-full flex items-center justify-center gap-2 py-3 mt-4" disabled={loading || !to || !amount}>
        {loading ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
        {loading ? 'Processing...' : 'Send XLM →'}
      </button>
    </form>
  );
}

function AtomicPayForm() {
  const [requestIdInput, setRequestIdInput] = useState('');
  const [requestId, setRequestId] = useState<number | undefined>(undefined);
  const [loadedRequest, setLoadedRequest] = useState<any>(null);
  const [fetchingRequest, setFetchingRequest] = useState(false);

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const { sendPayment, loading, result, error, reset } = useSendPayment();
  const { getRequest } = useContract();

  async function loadRequest() {
    if (!requestIdInput) return;
    setFetchingRequest(true);
    try {
      const id = parseInt(requestIdInput, 10);
      const req = await getRequest(id);
      if (req) {
        const amountXlm = (Number(req.amount) / 10_000_000).toString();
        setTo(req.from);
        setAmount(amountXlm);
        setMemo(req.memo ? req.memo.toString() : '');
        setRequestId(id);
        setLoadedRequest(req);
        toast.success(`Request #${id} loaded from contract!`);
      } else {
        toast.error('Request not found on-chain.');
        setLoadedRequest(null);
        setRequestId(undefined);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch request from contract.');
      setLoadedRequest(null);
      setRequestId(undefined);
    } finally {
      setFetchingRequest(false);
    }
  }

  const handleReset = () => {
    reset();
    setTo('');
    setAmount('');
    setMemo('');
    setRequestIdInput('');
    setRequestId(undefined);
    setLoadedRequest(null);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const tx = await sendPayment(to, amount, memo || undefined, requestId);
      toast.success('On-chain request paid & settled!');
    } catch (error) {
      toast.error(getFreighterError(error, 'Payment failed.'));
    }
  }

  if (result) {
    return (
      <div className="successBox">
        <CheckCircle2 size={42} />
        <h3>On-Chain Request Settled!</h3>
        <p>{result.amount} XLM to {truncateAddress(result.to)}</p>
        <code>{result.hash}</code>
        <div className="row flex gap-2 mt-2">
          <a className="btn ghost flex-1 flex items-center justify-center gap-1.5" href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Explorer</a>
          <button className="btn primary flex-1" onClick={handleReset}>Pay Another</button>
        </div>
      </div>
    );
  }

  return (
    <form className="form space-y-3" onSubmit={submit}>
      <div className="border border-violet-100 bg-violet-50/50 rounded-xl p-4 mb-2">
        <label className="block text-xs font-semibold text-violet-700 mb-1">
          Pay On-Chain Request ID
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={requestIdInput}
            onChange={(e) => setRequestIdInput(e.target.value)}
            placeholder="e.g. 5"
            className="flex-1 bg-white border border-violet-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-violet-500"
            disabled={loading || fetchingRequest}
          />
          <button
            type="button"
            onClick={loadRequest}
            disabled={loading || fetchingRequest || !requestIdInput}
            className="btn primary py-1.5 px-4 text-xs shrink-0"
          >
            {fetchingRequest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
          </button>
        </div>
        {loadedRequest && (
          <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
            ✓ Loaded Request #{requestId} from smart contract
          </p>
        )}
      </div>

      {loadedRequest && (
        <>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Recipient Address</span>
            <input value={to} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2 mt-1 outline-none text-gray-500 font-mono text-xs" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Amount (XLM)</span>
            <input value={amount} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2 mt-1 outline-none text-gray-500 font-bold" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Memo</span>
            <input value={memo} readOnly className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2 mt-1 outline-none text-gray-500 text-sm" />
          </label>
          {error && <div className="error text-red-500 text-sm flex items-center gap-1.5 mt-2"><AlertCircle size={16} />{error}</div>}
          <button className="btn primary full w-full flex items-center justify-center gap-2 py-3 mt-4" disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
            {loading ? 'Processing...' : `Settle On-Chain Request #${requestId} →`}
          </button>
        </>
      )}

      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Contract Address</p>
        <p className="text-[10px] font-mono text-gray-500 break-all select-all">{CONTRACT_ADDRESS}</p>
      </div>
    </form>
  );
}

function SendPanel() {
  const [sendMode, setSendMode] = useState<'simple' | 'atomic' | 'create'>('simple');

  return (
    <div>
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 mb-4">
        <button
          type="button"
          onClick={() => setSendMode('simple')}
          className={sendMode === 'simple' ? 'flex-1 bg-white text-violet-600 shadow-sm py-1.5 rounded-lg text-xs font-semibold border-0' : 'flex-1 text-gray-500 py-1.5 text-xs border-0 bg-transparent'}
        >
          Simple Send
        </button>
        <button
          type="button"
          onClick={() => setSendMode('create')}
          className={sendMode === 'create' ? 'flex-1 bg-white text-violet-600 shadow-sm py-1.5 rounded-lg text-xs font-semibold border-0' : 'flex-1 text-gray-500 py-1.5 text-xs border-0 bg-transparent'}
        >
          Create Request
        </button>
        <button
          type="button"
          onClick={() => setSendMode('atomic')}
          className={sendMode === 'atomic' ? 'flex-1 bg-white text-violet-600 shadow-sm py-1.5 rounded-lg text-xs font-semibold border-0' : 'flex-1 text-gray-500 py-1.5 text-xs border-0 bg-transparent'}
        >
          Pay Request
        </button>
      </div>

      {sendMode === 'simple' && <SendForm />}
      {sendMode === 'create' && <ContractRequests />}
      {sendMode === 'atomic' && <AtomicPayForm />}
    </div>
  );
}

function Dashboard() {
  const { address, isConnected } = useWalletStore();
  const [active, setActive] = useState<'send' | 'requests' | 'events' | 'groups' | 'pools'>('groups');
  
  const { getIncoming } = useRequestStore();
  
  const pendingCount = useMemo(() => {
    if (!address) return 0;
    return getIncoming(address).length;
  }, [getIncoming, address]);
  
  useBalance();
  useRealtimeRequests();
  useRealtimeGroups();
 
  const tabs = useMemo(() => [
    ['groups', Users, 'Split Bills (Groups)'],
    ['send', Send, 'Send XLM'],
    ['pools', Gift, 'Voluntary Pools'],
    ['requests', Inbox, 'Requests'],
    ['events', Radio, 'Live Feed'],
  ] as const, []);
 
  if (!isConnected) {
    return <Navigate to="/" replace />;
  }
 
  return (
    <>
      <Navbar />
      <main className="dash">
        <aside className="sidebar">
          <WalletInfo />
          <div className="sideNav">
            {tabs.map(([id, Icon, label]) => (
              <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
                <Icon size={18} /> {label}
                {id === 'requests' && pendingCount > 0 && <span>{pendingCount}</span>}
              </button>
            ))}
          </div>
        </aside>
        <section className="dashMain">
          <h2>{tabs.find(([id]) => id === active)?.[2]}</h2>
          <p>{active === 'send' ? 'Transfer XLM or pay on-chain requests' : active === 'groups' ? 'Divide group expenses and automatically settle debts using Soroban' : active === 'pools' ? 'Collect voluntary contributions for gifts, events, or shared costs directly in contract escrow' : active === 'requests' ? 'Pending requests from groups' : 'Live Contract Events'}</p>
          <div className="panel md:pb-6 pb-24">
            {active === 'send' && <SendPanel />}
            {active === 'groups' && <GroupPage />}
            {active === 'pools' && <PoolsPage />}
            {active === 'requests' && <RequestInbox />}
            {active === 'events' && <EventFeed />}
          </div>
        </section>
      </main>
      <TxStatusBar />
      <MobileNav active={active} setActive={setActive} />
    </>
  );
}

function PayPage() {
  const [params] = useSearchParams();
  const { isConnected, address } = useWalletStore();
  const { addRequests } = useRequestStore();
  const to = params.get('address') ?? '';
  const amount = params.get('amount') ?? '';
  const memo = params.get('memo') ?? '';
  const groupId = params.get('groupId') ?? undefined;
  const groupName = params.get('groupName') ?? undefined;

  function saveForLater() {
    addRequests([{
      fromAddress: 'Saved Link',
      fromName: 'Guest',
      toAddress: to,
      amount: amount,
      memo: memo,
      groupId,
      groupName,
      status: 'pending',
    }]);
    toast.success('Saved to your Requests Inbox!');
  }

  return (
    <main className="payPage">
      <Link to="/" className="back"><ArrowLeft size={16} /> StellarPay</Link>
      <section className="payCard">
        <div className="logoIcon big">S</div>
        <h1>StellarPay Request</h1>
        {amount && <strong>{amount} XLM</strong>}
        {memo && <p>{memo}</p>}
        {to && <code>{truncateAddress(to, 8)}</code>}
        {isConnected ? (
          <>
            <SendForm
              preset={{ to, amount, memo }}
              onSuccess={(txHash) => {
                addRequests([{
                  fromAddress: to,        // Creditor (receiver)
                  toAddress: address!,   // Debtor (payer, me)
                  fromName: 'Receiver',
                  amount: amount,
                  memo: memo || 'Paid via link',
                  groupId,
                  groupName,
                  status: 'paid',
                  txHash,
                }]);
              }}
            />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn ghost full" onClick={saveForLater} style={{ justifyContent: 'center' }}>
                <Inbox size={16} /> Save to Inbox
              </button>
            </div>
          </>
        ) : <><p>Connect your wallet to pay this request.</p><WalletConnect /></>}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="/pay" element={<PayPage />} />
    </Routes>
  );
}
