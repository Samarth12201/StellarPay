import { useState } from 'react';
import { ArrowRight, CheckCircle, Send, Bell, Loader2, ExternalLink, Copy, Clock } from 'lucide-react';
import { Settlement } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  settlements: Settlement[];
  myAddress: string;
  onPay: (s: Settlement) => Promise<string>;
  onRequest: (s: Settlement) => Promise<any>;
  paying: string | null;
  groupId?: string;
  groupName?: string;
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

  return (
    <div className="space-y-3">
      {settlements.map((s) => {
        const key = `${s.from}-${s.to}`;
        const txHash = txHashes[key];
        const isDone = !!txHash;
        const isMyPayment = s.fromAddress === myAddress;
        const isMyReceive = s.toAddress === myAddress;
        const isLoading = paying === key;

        return (
          <div key={key} className={`border rounded-2xl p-4 space-y-3 transition-all ${
            isDone ? 'border-green-200 bg-green-50' :
            isMyPayment ? 'border-red-100 bg-red-50/30' :
            isMyReceive ? 'border-violet-100 bg-violet-50/30' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: isDone ? '#059669' : isMyPayment ? '#DC2626' : '#7C3AED' }}>
                {s.fromName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-gray-800">
                  <span>{s.fromName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  <span>{s.toName}</span>
                  {isMyPayment && !isDone && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">you owe</span>}
                  {isMyReceive && !isDone && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">you receive</span>}
                  {isDone && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">paid ✓</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                  {s.fromAddress.slice(0, 8)}…{s.fromAddress.slice(-4)} → {s.toAddress.slice(0, 8)}…{s.toAddress.slice(-4)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-900">{s.amount}</p>
                <p className="text-xs text-gray-400">XLM</p>
              </div>
            </div>

            {isDone && (
              <div className="bg-green-100 rounded-xl px-3 py-2">
                <p className="text-[11px] font-semibold text-green-800 mb-1">Transaction confirmed</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-mono text-green-700 truncate flex-1">{txHash}</p>
                  <button onClick={() => { navigator.clipboard.writeText(txHash); toast.success('Copied!'); }} className="text-green-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-green-600">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {!isDone && (
              <div className="flex gap-2">
                {isMyPayment && (
                  <button onClick={async () => {
                    try {
                      const hash = await onPay(s);
                      setTxHashes((p) => ({ ...p, [key]: hash }));
                    } catch (err: any) { toast.error(err.message); }
                  }} disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Pay {s.amount} XLM</>}
                  </button>
                )}
                {isMyReceive && (
                  <button onClick={async () => {
                    try { await onRequest(s); toast.success(`Request sent to ${s.fromName}`); }
                    catch (err: any) { toast.error(err.message); }
                  }}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-violet-200 text-violet-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-50">
                    <Bell className="w-4 h-4" /> Request from {s.fromName}
                  </button>
                )}
                {!isMyPayment && !isMyReceive && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 py-2">
                    <Clock className="w-3.5 h-3.5" /> Waiting for {s.fromName} to pay
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
