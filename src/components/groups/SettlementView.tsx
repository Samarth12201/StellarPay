import { useState } from 'react';
import {
  ArrowRight, CheckCircle, Send, Bell,
  Loader2, ExternalLink, Copy, Clock
} from 'lucide-react';
import { Settlement } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  settlements: Settlement[];
  myAddress: string;
  onPay: (settlement: Settlement) => Promise<string>;
  onRequest: (settlement: Settlement) => void;
  paying: string | null;
}

export function SettlementView({ settlements, myAddress, onPay, onRequest, paying }: Props) {
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});

  if (settlements.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <p className="font-semibold text-gray-800">All settled up!</p>
        <p className="text-sm text-gray-400">No pending payments in this group.</p>
      </div>
    );
  }

  const handlePay = async (s: Settlement) => {
    try {
      const hash = await onPay(s);
      const key = `${s.from}-${s.to}`;
      setTxHashes((prev) => ({ ...prev, [key]: hash }));
      toast.success(`Paid ${s.amount} XLM to ${s.toName}!`);
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed. Check your balance and try again.');
    }
  };

  const handleRequest = async (s: Settlement) => {
    try {
      // 1. Save locally
      onRequest(s);
      
      // 2. Generate shareable link
      const url = new URL(window.location.origin);
      url.pathname = '/pay';
      url.searchParams.set('address', s.toAddress);
      url.searchParams.set('amount', s.amount.toFixed(7));
      url.searchParams.set('memo', `Group settlement: ${s.fromName}`.slice(0, 28));

      const shareData = {
        title: 'Payment Request - StellarPay',
        text: `Hey! Please pay ${s.amount} XLM to settle up our group expenses.`,
        url: url.toString()
      };

      // 3. Try native share, fallback to clipboard
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          toast.success('Payment request shared!');
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            await navigator.clipboard.writeText(url.toString());
            toast.success('Payment link copied to clipboard!');
          }
        }
      } else {
        await navigator.clipboard.writeText(url.toString());
        toast.success('Payment link copied to clipboard!');
      }

    } catch (err: any) {
      toast.error(err.message ?? 'Could not send request');
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    toast.success('TX hash copied!');
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {settlements.length} settlement{settlements.length !== 1 ? 's' : ''} needed
      </p>

      {settlements.map((s) => {
        const key = `${s.from}-${s.to}`;
        const txHash = txHashes[key];
        const isDone = !!txHash;
        const isMyPayment = s.fromAddress === myAddress;   // I owe this
        const isMyReceive = s.toAddress === myAddress;     // I'm owed this
        const isLoading = paying === key;

        return (
          <div
            key={key}
            className={`border rounded-2xl p-4 space-y-3 transition-all ${
              isDone
                ? 'border-green-200 bg-green-50'
                : isMyPayment
                ? 'border-red-100 bg-red-50/30'
                : isMyReceive
                ? 'border-violet-100 bg-violet-50/30'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Settlement row */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: isDone ? '#059669' : isMyPayment ? '#DC2626' : '#7C3AED' }}
              >
                {s.fromName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{s.fromName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800">{s.toName}</span>
                  {isMyPayment && !isDone && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      you owe
                    </span>
                  )}
                  {isMyReceive && !isDone && (
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                      you receive
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      paid ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                  {s.fromAddress.slice(0, 8)}…{s.fromAddress.slice(-4)}
                  {' → '}
                  {s.toAddress.slice(0, 8)}…{s.toAddress.slice(-4)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-900">{s.amount}</p>
                <p className="text-xs text-gray-400">XLM</p>
              </div>
            </div>

            {/* TX hash (after payment) */}
            {isDone && (
              <div className="bg-green-100 rounded-xl px-3 py-2">
                <p className="text-[11px] font-semibold text-green-800 mb-1">Transaction confirmed</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-mono text-green-700 truncate flex-1">{txHash}</p>
                  <button onClick={() => copyHash(txHash)} className="text-green-600 hover:text-green-800 flex-shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!isDone && (
              <div className="flex gap-2">
                {isMyPayment && (
                  <button
                    onClick={() => handlePay(s)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Pay {s.amount} XLM</>
                    )}
                  </button>
                )}

                {isMyReceive && (
                  <button
                    onClick={() => handleRequest(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-violet-200 text-violet-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-all"
                  >
                    <Bell className="w-4 h-4" />
                    Send Request to {s.fromName}
                  </button>
                )}

                {!isMyPayment && !isMyReceive && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 py-2">
                    <Clock className="w-3.5 h-3.5" />
                    Waiting for {s.fromName} to pay
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
