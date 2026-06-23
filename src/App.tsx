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
  Radio
} from 'lucide-react';
import { useRequestStore, useWalletStore } from './store';
import type { Participant, PaymentRequest, TransactionResult } from './types';
import { formatXlm, isValidStellarAddress, server, truncateAddress } from './utils';

import { useWallet } from './hooks/useWallet';
import { WalletConnect } from './components/wallet/WalletConnect';
import { TxStatusBar } from './components/tx/TxStatusBar';
import { ContractRequests } from './components/contract/ContractRequests';
import { EventFeed } from './components/events/EventFeed';

function getFreighterError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return fallback;
}



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

function useSendPayment() {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPayment = async (to: string, amount: string, memo?: string) => {
    if (!address) throw new Error('Connect Freighter first.');
    if (!isValidStellarAddress(to)) throw new Error('Recipient must be a valid Stellar public key.');

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const source = await server.loadAccount(address);
      let builder = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      }).addOperation(Operation.payment({ destination: to, asset: Asset.native(), amount })).setTimeout(180);

      if (memo) builder = builder.addMemo(Memo.text(memo.slice(0, 28)));
      const transaction = builder.build();
      const signedXdr = await signXdr(transaction.toXDR());

      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      const response = await server.submitTransaction(signedTx);
      const tx = { hash: response.hash, to, amount, memo, status: 'success' as const, timestamp: new Date() };
      setResult(tx);
      return tx;
    } catch (error) {
      const message = getFreighterError(error, 'Transaction failed.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { sendPayment, result, loading, error, reset: () => { setResult(null); setError(null); } };
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

function BillSplitter() {
  const { address } = useWalletStore();
  const { addRequests } = useRequestStore();
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [participants, setParticipants] = useState<Participant[]>([{ id: nanoid(), address: '' }, { id: nanoid(), address: '' }]);
  const [splits, setSplits] = useState<Array<{ address: string; owes: number }> | null>(null);

  function updateParticipant(id: string, field: 'address' | 'amount', value: string) {
    setParticipants((items) => items.map((item) => (item.id === id ? { ...item, [field]: field === 'amount' ? Number(value) : value } : item)));
  }

  function calculate() {
    const totalAmount = Number(total);
    const walletParticipants = participants.filter((participant) => participant.address.trim());
    if (!totalAmount || walletParticipants.length === 0) {
      toast.error('Add a total and at least one wallet address.');
      return;
    }
    const invalid = walletParticipants.find((participant) => !isValidStellarAddress(participant.address));
    if (invalid) {
      toast.error(`Invalid Stellar address: ${truncateAddress(invalid.address, 5)}`);
      return;
    }
    const next = splitType === 'equal'
      ? walletParticipants.map((participant) => ({ address: participant.address, owes: Number((totalAmount / walletParticipants.length).toFixed(7)) }))
      : walletParticipants.map((participant) => ({ address: participant.address, owes: Number((participant.amount || 0).toFixed(7)) }));
    setSplits(next);
  }

  function createRequests() {
    if (!address || !splits) return;
    const requests: PaymentRequest[] = splits.map((split) => ({
      id: nanoid(),
      from: split.address,
      toAddress: address,
      amount: String(split.owes),
      memo: title || 'Bill Split',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }));
    addRequests(requests);
    toast.success(`${requests.length} payment requests created.`);
  }

  return (
    <div className="form">
      <label>Bill Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Goa Trip Dinner" /></label>
      <label>Total Amount (XLM)<input value={total} onChange={(event) => setTotal(event.target.value)} type="number" placeholder="0.00" /></label>
      <div className="toggle">
        <button className={splitType === 'equal' ? 'active' : ''} onClick={() => setSplitType('equal')}>Equal Split</button>
        <button className={splitType === 'custom' ? 'active' : ''} onClick={() => setSplitType('custom')}>Custom Split</button>
      </div>
      {participants.map((participant) => (
        <div className="participant" key={participant.id}>
          <input value={participant.address} onChange={(event) => updateParticipant(participant.id, 'address', event.target.value)} placeholder="Participant wallet address (G...)" />
          {splitType === 'custom' && <input value={participant.amount ?? ''} onChange={(event) => updateParticipant(participant.id, 'amount', event.target.value)} type="number" placeholder="XLM" />}
          <button onClick={() => setParticipants((items) => items.filter((item) => item.id !== participant.id))}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="add" onClick={() => setParticipants((items) => [...items, { id: nanoid(), address: '' }])}>+ Add Wallet Address</button>
      <button className="btn primary full" onClick={calculate}><Calculator size={16} /> Calculate Split →</button>
      {splits && (
        <div className="splitResults">
          <h4>{title || 'Bill Split'} · {total} XLM</h4>
          {splits.map((split) => <div className="splitRow" key={split.address}><span>{truncateAddress(split.address, 8)}</span><strong>{split.owes} XLM</strong></div>)}
          <button className="btn ghost full" onClick={createRequests} disabled={!address}>Create Payment Requests</button>
        </div>
      )}
    </div>
  );
}


function RequestInbox() {
  const { address } = useWalletStore();
  const { requests, updateStatus } = useRequestStore();
  const { sendPayment, loading } = useSendPayment();
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const received = requests.filter((r) => r.status === 'pending' && r.from === address);
  const sent = requests.filter((r) => r.status === 'pending' && r.toAddress === address);

  async function pay(request: PaymentRequest) {
    try {
      await sendPayment(request.toAddress, request.amount, request.memo);
      updateStatus(request.id, 'paid');
      toast.success(`Paid ${request.amount} XLM`);
    } catch (error) {
      toast.error(getFreighterError(error, 'Could not pay request.'));
    }
  }

  function copyLink(request: PaymentRequest) {
    const url = `${window.location.origin}/pay?address=${request.toAddress}&amount=${request.amount}&memo=${encodeURIComponent(request.memo || '')}`;
    navigator.clipboard.writeText(url);
    toast.success('Payment link copied!');
  }

  const list = tab === 'received' ? received : sent;

  return (
    <div className="requestsBox">
      <div className="toggle" style={{ marginBottom: '16px' }}>
        <button className={tab === 'received' ? 'active' : ''} onClick={() => setTab('received')}>Received ({received.length})</button>
        <button className={tab === 'sent' ? 'active' : ''} onClick={() => setTab('sent')}>Sent ({sent.length})</button>
      </div>

      {list.length === 0 ? (
        <div className="empty"><Inbox size={34} /><p>No pending {tab} requests</p></div>
      ) : (
        <div className="requests">
          {list.map((request) => (
            <article className="requestCard" key={request.id}>
              <div>
                <h4>{tab === 'received' ? `${truncateAddress(request.from, 8) || 'Someone'} requests payment` : `You requested from ${truncateAddress(request.from, 8) || 'Someone'}`}</h4>
                <p>{request.memo}</p>
              </div>
              <strong>{request.amount} XLM</strong>
              <div className="row">
                {tab === 'received' ? (
                  <>
                    <button className="btn ghost danger" onClick={() => updateStatus(request.id, 'rejected')}>Reject</button>
                    <button className="btn primary" disabled={loading || !request.toAddress} onClick={() => pay(request)}>Pay →</button>
                  </>
                ) : (
                  <>
                    <button className="btn ghost danger" onClick={() => updateStatus(request.id, 'rejected')}>Cancel</button>
                    <button className="btn primary" onClick={() => copyLink(request)}><Copy size={16} /> Copy Link</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { address, isConnected } = useWalletStore();
  const [active, setActive] = useState<'send' | 'split' | 'requests' | 'contract' | 'events'>('send');
  const pendingCount = useRequestStore((store) => store.requests.filter((request) => request.status === 'pending' && request.from === address).length);
  const fetchRequests = useRequestStore((store) => store.fetchRequests);
  useBalance();



  useEffect(() => {
    if (address) {
      fetchRequests(address);
    }
  }, [address, fetchRequests]);

  const tabs = useMemo(() => [
    ['send', Send, 'Send XLM'],
    ['split', Calculator, 'Split Bill'],
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
          <p>{active === 'send' ? 'Transfer XLM on Stellar Testnet' : active === 'split' ? 'Divide expenses between friends' : active === 'requests' ? 'Pending requests from bill splits' : active === 'contract' ? 'Interact with the Payment Request Contract' : 'Live Contract Events'}</p>
          <div className="panel">
            {active === 'send' && <SendForm />}
            {active === 'split' && <BillSplitter />}
            {active === 'requests' && <RequestInbox />}
            {active === 'contract' && <ContractRequests />}
            {active === 'events' && <EventFeed />}
          </div>
        </section>
      </main>
      <TxStatusBar />
    </>
  );
}

function PayPage() {
  const [params] = useSearchParams();
  const { isConnected } = useWalletStore();
  const { addRequests } = useRequestStore();
  const to = params.get('address') ?? '';
  const amount = params.get('amount') ?? '';
  const memo = params.get('memo') ?? '';

  function saveForLater() {
    addRequests([{
      id: nanoid(),
      from: address || 'Saved Link',
      toAddress: to,
      amount: amount,
      memo: memo,
      status: 'pending',
      createdAt: new Date().toISOString(),
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
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/pay" element={<PayPage />} />
    </Routes>
  );
}
