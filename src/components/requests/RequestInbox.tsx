import { useWalletStore } from '../../store/walletStore';
import { useRequestStore } from '../../store/requestStore';
import { useSendPayment } from '../../hooks/useSendPayment';
import { Send, X, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

export function RequestInbox() {
  const { address } = useWalletStore();
  const { getIncoming, markPaid, markRejected } = useRequestStore();
  const { sendPayment, loading } = useSendPayment();

  // ONLY requests where toAddress === connected wallet address
  const pending = address ? getIncoming(address) : [];

  const handlePay = async (req: ReturnType<typeof getIncoming>[0]) => {
    try {
      const tx = await sendPayment(req.fromAddress, req.amount, req.memo);
      await markPaid(req.id, tx.hash);
      toast.success(`Paid ${req.amount} XLM to ${req.fromName}!`);
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed');
    }
  };

  if (!address) {
    return (
      <div className="text-center py-10 text-gray-400 space-y-2">
        <Inbox className="w-8 h-8 mx-auto opacity-30" />
        <p className="text-sm">Connect your wallet to see requests</p>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 space-y-2">
        <Inbox className="w-8 h-8 mx-auto opacity-30" />
        <p className="text-sm font-medium">No pending requests</p>
        <p className="text-xs max-w-xs mx-auto">
          When a group member sends you a payment request, it appears here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
        {pending.length} pending
      </p>
      {pending.map((req) => (
        <div key={req.id} className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                {req.fromName} requests payment
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{req.memo}</p>
              {req.groupName && (
                <span className="inline-block text-[10px] bg-violet-50 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-full mt-1">
                  {req.groupName}
                </span>
              )}
              <p className="text-[10px] text-gray-300 font-mono mt-1 truncate">
                From: {req.fromAddress.slice(0, 12)}…{req.fromAddress.slice(-4)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-violet-600">{req.amount}</p>
              <p className="text-xs text-gray-400">XLM</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => markRejected(req.id)}
              className="flex items-center gap-1.5 border border-red-200 text-red-500 px-3 py-2.5 rounded-xl text-sm hover:bg-red-50"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
            <button
              onClick={() => handlePay(req)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Paying...' : `Pay ${req.amount} XLM`}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
