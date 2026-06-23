import { useEventStore, ContractEvent } from '../../store';
import { useContractEvents } from '../../hooks/useContractEvents';
import { CheckCircle, PlusCircle, XCircle, Loader2 } from 'lucide-react';

const EVENT_CONFIG = {
  created: { icon: <PlusCircle className="w-4 h-4 text-violet-500" />, color: 'text-violet-700', bg: 'bg-violet-50', label: 'Request created' },
  paid:    { icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-700', bg: 'bg-green-50', label: 'Paid' },
  rejected:{ icon: <XCircle className="w-4 h-4 text-red-400" />, color: 'text-red-700', bg: 'bg-red-50', label: 'Rejected' },
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function EventFeed() {
  useContractEvents();
  const { events } = useEventStore();

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-sm">Listening for contract events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => {
        const cfg = EVENT_CONFIG[e.type] ?? EVENT_CONFIG.created;
        return (
          <div key={e.id} className={`flex items-start gap-3 ${cfg.bg} rounded-xl p-3`}>
            <div className="mt-0.5">{cfg.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cfg.color}`}>
                {cfg.label} — Request #{e.requestId}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {e.actor.slice(0, 8)}...{e.actor.slice(-4)}
                {e.amount !== undefined ? ` · ${e.amount.toFixed(2)} XLM` : ''}
              </p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(e.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
