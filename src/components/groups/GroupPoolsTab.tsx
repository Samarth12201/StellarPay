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
      toast.success('Crowdfunding pool successfully created on-chain!');
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
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gift className="text-indigo-400 w-5 h-5" /> Group Crowdfunding Pools
          </h3>
          <p className="text-xs text-slate-400">Collect voluntary contributions for gifts, events, or shared costs.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition duration-200"
        >
          <Plus className="w-4 h-4" /> Create Pool
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* USDC Trustline Helper Card */}
      <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="text-yellow-400 w-3.5 h-3.5" /> Stablecoin Enabled (Circle USDC)
          </h4>
          <p className="text-xs text-slate-400">To create or contribute to USDC pools, make sure your wallet has the USDC trustline established.</p>
        </div>
        <button
          onClick={handleAddTrustline}
          className="px-3 py-1.5 self-start md:self-auto bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
        >
          Add USDC Trustline
        </button>
      </div>

      {/* Create Pool Form Modal/Dropdown */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/80 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <h4 className="text-sm font-semibold text-white">New Crowdfunding Campaign</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Pool Title</label>
              <input
                type="text"
                placeholder="e.g. John's Birthday Cake"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Target Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.0"
                  step="0.001"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  required
                />
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value as 'XLM' | 'USDC')}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-indigo-400 font-semibold focus:outline-none focus:border-indigo-500 transition cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/10 transition"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create On-Chain Pool
            </button>
          </div>
        </form>
      )}

      {/* Pools Grid */}
      {pools.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/10 rounded-xl border border-dashed border-slate-800/80">
          <Gift className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No active pools in this group yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pools.map((p) => {
            const pct = Math.min(100, Math.round((p.balance / p.targetAmount) * 100));
            const isCreator = address && address.toLowerCase() === p.creator.toLowerCase();

            return (
              <div
                key={p.id}
                className={`bg-slate-900/40 p-4 rounded-xl border ${
                  p.closed ? 'border-emerald-800/30 bg-emerald-950/5' : 'border-slate-800'
                } flex flex-col justify-between gap-4`}
              >
                {/* Pool Header */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.closed
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800/40'
                    }`}>
                      {p.closed ? 'Closed & Disbursed' : 'Active Pool'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {p.asset} Campaign
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-semibold text-white">{p.title}</h4>
                  <p className="text-[11px] text-slate-400">
                    Created by:{' '}
                    <span className="text-indigo-400 font-mono">
                      {p.creator.slice(0, 6)}...{p.creator.slice(-4)}
                    </span>
                  </p>
                </div>

                {/* Progress Bar Area */}
                <div className="space-y-1">
                  <div className="flex justify-between items-end text-xs">
                    <span className="text-[11px] text-slate-400">Progress</span>
                    <span className="font-bold text-white">
                      {p.balance} / {p.targetAmount} {p.asset} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.closed
                          ? 'bg-emerald-500'
                          : pct >= 100
                          ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Contributor Action Area */}
                {!p.closed ? (
                  <div className="space-y-3 pt-2 border-t border-slate-800/60">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={`Amount (${p.asset})`}
                        step="0.001"
                        value={donateAmounts[p.id] || ''}
                        onChange={(e) =>
                          setDonateAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                      />
                      <button
                        onClick={() => handleDonate(p.id, p.asset)}
                        disabled={loading}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                      >
                        Donate
                      </button>
                    </div>

                    {isCreator && p.balance > 0 && (
                      <button
                        onClick={() => handleWithdraw(p.id, p.asset)}
                        disabled={loading}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs font-bold rounded-lg border border-emerald-500/20 transition flex items-center justify-center gap-1"
                      >
                        Withdraw Pool to Wallet ({p.balance} {p.asset})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/20 py-2 rounded-lg border border-emerald-800/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Funds Disbursed to Creator</span>
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
