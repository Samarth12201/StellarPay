import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { useWalletStore } from '../../store';
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
