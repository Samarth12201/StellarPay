import { useTxStore, TxStatus } from '../../store';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

const STATUS_CONFIG: Record<TxStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Preparing transaction...', color: '#F59E0B', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  signing:    { label: 'Waiting for wallet signature...', color: '#8B5CF6', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  confirming: { label: 'Confirming on chain...', color: '#3B82F6', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  success:    { label: 'Confirmed!', color: '#10B981', icon: <CheckCircle className="w-4 h-4" /> },
  failed:     { label: 'Failed', color: '#EF4444', icon: <XCircle className="w-4 h-4" /> },
};

export function TxStatusBar() {
  const { transactions, clearCompleted } = useTxStore();
  const active = transactions.slice(0, 5);

  if (active.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 space-y-2 z-50">
      {active.map((tx) => {
        const cfg = STATUS_CONFIG[tx.status];
        return (
          <div
            key={tx.id}
            className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span className="text-xs font-semibold text-gray-800 flex-1">{cfg.label}</span>
              {(tx.status === 'success' || tx.status === 'failed') && (
                <button
                  onClick={clearCompleted}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{tx.description}</p>
            {tx.hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View on Explorer
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
