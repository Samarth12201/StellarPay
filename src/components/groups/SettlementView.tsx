import { useState } from 'react';
import { ArrowRight, CheckCircle, Send, Bell, Loader2, ExternalLink, Copy } from 'lucide-react';
import { Settlement } from '../../types';
import { useWalletStore } from '../../store/walletStore';
import toast from 'react-hot-toast';

interface Props {
  settlements: Settlement[];
  myAddress: string;
  onPay: (settlement: Settlement) => Promise<string>;        // pays now
  onRequest: (settlement: Settlement) => void;               // sends request to payer
  paying: string | null;
}

export function SettlementView({ settlements, myAddress, onPay, onRequest, paying }: Props) {
  const [paidTx, setPaidTx] = useState<Record<string, string>>({});

  if (settlements.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
        <p className="font-semibold text-gray-800">All settled up!</p>
        <p className="text-sm text-gray-400">No pending payments.</p>
      </div>
    );
  }

  const handlePay = async (s: Settlement) => {
    try {
      const hash = await onPay(s);
      setPaidTx((prev) => ({ ...prev, [`${s.from}-${s.to}`]: hash }));
      toast.success(`Paid ${s.amount} XLM to ${s.toName}!`);
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed');
    }
  };

  const handleRequest = (s: Settlement) => {
    onRequest(s);
    toast.success(`Payment request sent to ${s.fromName}`);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('TX hash copied!');
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {settlements.filter((s) => !paidTx[`${s.from}-${s.to}`]).length} payment
        {settlements.length !== 1 ? 's' : ''} to settle
      </p>

      {settlements.map((s) => {
        const key = `${s.from}-${s.to}`;
        const txHash = paidTx[key];
        const isMyPayment = s.fromAddress === myAddress;   // I need to pay this
        const isMyReceive = s.toAddress === myAddress;     // someone owes me
        const isLoading = paying === key;
        const isDone = !!txHash;

        return (
          <div
            key={key}
            className={`border rounded-xl p-4 space-y-3 transition-all ${
              isDone ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Row: from → to + amount */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: isDone ? '#059669' : '#7C3AED' }}
              >
                {s.fromName[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <span>{s.fromName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  <span>{s.toName}</span>
                  {isMyPayment && (
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full ml-1">you pay</span>
                  )}
                  {isMyReceive && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">you receive</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  {s.fromAddress.slice(0, 8)}...{s.fromAddress.slice(-4)}
                  {' '}&rarr;{' '}
                  {s.toAddress.slice(0, 8)}...{s.toAddress.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-violet-600">{s.amount}</p>
                <p className="text-xs text-gray-400">XLM</p>
              </div>
            </div>

            {/* TX success */}
            {isDone && (
              <div className="bg-green-100 rounded-lg px-3 py-2 space-y-1">
                <p className="text-xs font-semibold text-green-800">
                  ✓ Paid on-chain
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-green-700 truncate flex-1">{txHash}</p>
                  <button onClick={() => copyHash(txHash)} className="text-green-600 hover:text-green-800">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!isDone && (
              <div className="flex gap-2">
                {isMyReceive && (
                  /* I'm owed — I can send a reminder/request to the payer */
                  <button
                    onClick={() => handleRequest(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-violet-200 text-violet-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-50"
                  >
                    <Bell className="w-4 h-4" />
                    Send request
                  </button>
                )}

                {isMyPayment && (
                  /* I owe — I can pay now */
                  <button
                    onClick={() => handlePay(s)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
                  >
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Paying...</>
                      : <><Send className="w-4 h-4" /> Pay {s.amount} XLM</>
                    }
                  </button>
                )}

                {!isMyPayment && !isMyReceive && (
                  /* Third-party view — just showing info */
                  <p className="text-xs text-gray-400 py-2">
                    Waiting for {s.fromName} to pay
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
