import React, { useState } from 'react';
import { Group, Pool } from '../../types';
import { useGroupPools } from '../../hooks/useGroupPools';
import { useWalletStore } from '../../store/walletStore';
import { Plus, Gift, Award, DollarSign, Loader2, AlertCircle, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GroupPoolsTabProps {
  group: Group;
}

export function GroupPoolsTab({ group }: GroupPoolsTabProps) {
  const { address } = useWalletStore();
  const {
    loading,
    error,
    addUsdcTrustline,
    createPoolOnChain,
    contributeToPoolOnChain,
    withdrawFromPoolOnChain
  } = useGroupPools(group.id);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('XLM');

  // Donation state per pool ID
  const [donateAmounts, setDonateAmounts] = useState<Record<string, string>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      toast.error('Please fill in valid details');
      return;
    }

    try {
      const parsedAmount = parseFloat(targetAmount);
      await createPoolOnChain(title.trim(), parsedAmount, asset);
      toast.success('Pool created successfully!');
      setShowCreate(false);
      setTitle('');
      setTargetAmount('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create pool');
    }
  };

  const handleDonate = async (poolId: string, poolAsset: 'XLM' | 'USDC') => {
    const amountStr = donateAmounts[poolId];
    if (!amountStr || parseFloat(amountStr) <= 0) {
      toast.error('Enter a valid contribution amount');
      return;
    }

    try {
      const amount = parseFloat(amountStr);
      await contributeToPoolOnChain(poolId, amount, poolAsset);
      toast.success(`Contributed ${amount} ${poolAsset} successfully!`);
      setDonateAmounts(prev => ({ ...prev, [poolId]: '' }));
    } catch (err: any) {
      toast.error(err?.message ?? 'Contribution failed');
    }
  };

  const handleWithdraw = async (poolId: string, poolAsset: 'XLM' | 'USDC') => {
    try {
      await withdrawFromPoolOnChain(poolId, poolAsset);
      toast.success('Funds successfully withdrawn and pool closed!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Withdrawal failed');
    }
  };

  const handleAddTrustline = async () => {
    try {
      await addUsdcTrustline();
      toast.success('USDC Trustline established successfully!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to establish trustline');
    }
  };

  const pools = group.pools || [];

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-violet-50 p-4 rounded-2xl border border-violet-200">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Gift className="text-violet-500 w-5 h-5" /> Crowdfunding Pools
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Collect voluntary contributions for gifts, events, or shared costs.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Create Pool
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* USDC Trustline Helper Card */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="text-amber-500 w-3.5 h-3.5" /> Stablecoin Enabled (Circle USDC)
          </h4>
          <p className="text-xs text-gray-500">To create or contribute to USDC pools, establish the USDC trustline first.</p>
        </div>
        <button
          onClick={handleAddTrustline}
          className="px-3 py-1.5 self-start md:self-auto bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 transition"
        >
          Add USDC Trustline
        </button>
      </div>

      {/* Create Pool Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-violet-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-gray-900">New Crowdfunding Campaign</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Pool Title</label>
              <input
                type="text"
                placeholder="e.g. John's Birthday Cake"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Target Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.0"
                  step="0.001"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                  required
                />
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value as 'XLM' | 'USDC')}
                  className="bg-gray-50 border border-gray-300 rounded-xl px-3 text-sm text-violet-600 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 transition cursor-pointer"
                >
                  <option value="XLM">XLM</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Pool
            </button>
          </div>
        </form>
      )}

      {/* Pools Grid */}
      {pools.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <Gift className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">No active pools yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Create Pool" above to start a campaign.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pools.map((p) => {
            const pct = Math.min(100, Math.round((p.balance / p.targetAmount) * 100));
            const isCreator = address && address.toLowerCase() === p.creator.toLowerCase();

            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-4 ${
                  p.closed ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                {/* Pool Header */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.closed
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-violet-100 text-violet-700 border border-violet-200'
                    }`}>
                      {p.closed ? '✓ Closed & Disbursed' : '● Active Pool'}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400">
                      {p.asset} Campaign
                    </span>
                  </div>
                  
                  <h4 className="text-base font-bold text-gray-900">{p.title}</h4>
                  <p className="text-[11px] text-gray-500">
                    Created by:{' '}
                    <span className="text-violet-600 font-mono">
                      {p.creator.slice(0, 6)}...{p.creator.slice(-4)}
                    </span>
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end text-xs">
                    <span className="text-gray-500 font-medium">Progress</span>
                    <span className="font-bold text-gray-900">
                      {p.balance} / {p.targetAmount} {p.asset} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.closed
                          ? 'bg-green-500'
                          : pct >= 100
                          ? 'bg-violet-500 shadow-[0_0_8px_#7c3aed]'
                          : 'bg-gradient-to-r from-violet-600 to-violet-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Action Area */}
                {!p.closed ? (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={`Amount (${p.asset})`}
                        step="0.001"
                        value={donateAmounts[p.id] || ''}
                        onChange={(e) =>
                          setDonateAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                      />
                      <button
                        onClick={() => handleDonate(p.id, p.asset)}
                        disabled={loading}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition disabled:opacity-50"
                      >
                        Donate
                      </button>
                    </div>

                    {isCreator && p.balance > 0 && (
                      <button
                        onClick={() => handleWithdraw(p.id, p.asset)}
                        disabled={loading}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Withdraw Pool to Wallet ({p.balance} {p.asset})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-green-700 bg-green-50 py-2.5 rounded-xl border border-green-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-semibold">Funds Disbursed to Creator</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
