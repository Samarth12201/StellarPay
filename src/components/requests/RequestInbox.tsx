import { useWalletStore } from '../../store/walletStore';
import { useRequestStore } from '../../store/requestStore';
import { useSendPayment } from '../../hooks/useSendPayment';
import { Send, X, ExternalLink, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

export function RequestInbox() {
  const { address } = useWalletStore();
  const { getIncoming, markPaid, markRejected } = useRequestStore();
  const { sendPayment, loading } = useSendPayment();

  // Only show requests where toAddress === my wallet address
  const pending = address ? getIncoming(address) : [];

  const handlePay = async (req: ReturnType<typeof getIncoming>[0]) => {
    try {
      const tx = await sendPayment(req.fromAddress, req.amount, req.memo);
      markPaid(req.id, tx.hash);
      toast.success(`Paid ${req.amount} XLM to ${req.fromName}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed');
    }
  };

  if (pending.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No pending requests</p>
        <p className="text-xs mt-1">Requests sent to your wallet address will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((req) => (
        <div key={req.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {req.fromName} requests
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{req.memo}</p>
              {req.groupName && (
                <p className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full inline-block mt-1">
                  {req.groupName}
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-violet-600">{req.amount} XLM</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => markRejected(req.id)}
              className="flex items-center gap-1 border border-red-200 text-red-500 px-3 py-2 rounded-xl text-sm hover:bg-red-50"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
            <button
              onClick={() => handlePay(req)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
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
