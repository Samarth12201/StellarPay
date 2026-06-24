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
  Users
} from 'lucide-react';
import { useRequestStore, useWalletStore } from './store';
import type { Participant, PaymentRequest, TransactionResult } from './types';
import { formatXlm, isValidStellarAddress, server, truncateAddress } from './utils';
import { useGroupStore } from './store/groupStore';

import { useWallet } from './hooks/useWallet';
import { useSendPayment, getFreighterError } from './hooks/useSendPayment';
import { WalletConnect } from './components/wallet/WalletConnect';
import { TxStatusBar } from './components/tx/TxStatusBar';
import { ContractRequests } from './components/contract/ContractRequests';
import { EventFeed } from './components/events/EventFeed';
import { GroupPage } from './pages/GroupPage';
import { MobileNav } from './components/layout/MobileNav';
import { RequestInbox } from './components/requests/RequestInbox';
function useBalance() {
  const { address, setBalance } = useWalletStore();

  useEffect(() => {
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
    const timer = window.setInterval(loadBalance, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, setBalance]);
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

function SendForm({ preset }: { preset?: { to?: string; amount?: string; memo?: string } }) {
  const [to, setTo] = useState(preset?.to ?? '');
  const [amount, setAmount] = useState(preset?.amount ?? '');
  const [memo, setMemo] = useState(preset?.memo ?? '');
  const { sendPayment, loading, result, error, reset } = useSendPayment();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await sendPayment(to, amount, memo || undefined);
      toast.success('Payment sent!');
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
        <div className="row">
          <a className="btn ghost" href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Explorer</a>
          <button className="btn primary" onClick={reset}>Send Again</button>
        </div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Recipient Address<input value={to} onChange={(event) => setTo(event.target.value)} placeholder="G... (Stellar public key)" required /></label>
      <label>Amount (XLM)<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.0000001" step="0.0000001" placeholder="0.00" required /></label>
      <label>Memo <span>(optional, max 28 chars)</span><input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={28} placeholder="e.g. Dinner split" /></label>
      {error && <div className="error"><AlertCircle size={16} />{error}</div>}
      <button className="btn primary full" disabled={loading || !to || !amount}>
        {loading ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
        {loading ? 'Sending...' : 'Send XLM →'}
      </button>
    </form>
  );
}


function Dashboard() {
  const { address, isConnected } = useWalletStore();
  const [active, setActive] = useState<'send' | 'requests' | 'contract' | 'events' | 'groups'>('groups');
  
  const { getIncoming } = useRequestStore();
  
  const pendingCount = useMemo(() => {
    if (!address) return 0;
    return getIncoming(address).length;
  }, [getIncoming, address]);
  
  useBalance();

  const tabs = useMemo(() => [
    ['groups', Users, 'Split Bills (Groups)'],
    ['send', Send, 'Send XLM'],
    ['requests', Inbox, 'Requests'],
    ['contract', FileCode, 'Contract'],
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
          <p>{active === 'send' ? 'Transfer XLM on Stellar Testnet' : active === 'groups' ? 'Divide group expenses and automatically settle debts using Soroban' : active === 'requests' ? 'Pending requests from groups' : active === 'contract' ? 'Interact with the Payment Request Contract' : 'Live Contract Events'}</p>
          <div className="panel" style={{ paddingBottom: '80px' }}>
            {active === 'send' && <SendForm />}
            {active === 'groups' && <GroupPage />}
            {active === 'requests' && <RequestInbox />}
            {active === 'contract' && <ContractRequests />}
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

  function saveForLater() {
    addRequests([{
      fromAddress: 'Saved Link',
      fromName: 'Guest',
      toAddress: to,
      amount: amount,
      memo: memo,
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
            <SendForm preset={{ to, amount, memo }} />
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
