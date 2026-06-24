import { Settlement } from '../../types';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  settlements: Settlement[];
  onPay: (settlement: Settlement) => void;
  loading: boolean;
}

export function SettlementView({ settlements, onPay, loading }: Props) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-gray-800">All settled up!</p>
        <p className="text-sm text-gray-400 mt-1">No pending payments in this group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {settlements.length} payment{settlements.length !== 1 ? 's' : ''} to settle
      </p>
      {settlements.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border border-gray-200 rounded-xl p-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span>{s.fromName}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span>{s.toName}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.from.slice(0, 6)}... → {s.to.slice(0, 6)}...
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-violet-600">{s.amount} XLM</p>
            <button
              onClick={() => onPay(s)}
              disabled={loading}
              className="mt-1 text-xs flex items-center gap-1 bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              Pay
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
