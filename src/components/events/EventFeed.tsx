import { useEventStore, ContractEvent } from '../../store';
import { useRequestStore } from '../../store/requestStore';
import { useWalletStore } from '../../store/walletStore';
import { useContractEvents } from '../../hooks/useContractEvents';
import { CheckCircle, PlusCircle, XCircle, Loader2, Inbox, Send } from 'lucide-react';

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
  const { requests } = useRequestStore();
  const { address } = useWalletStore();

  const requestEvents = requests
    .filter((request) => {
      if (!address) return true;
      return (
        request.toAddress.toLowerCase() === address.toLowerCase() ||
        request.fromAddress.toLowerCase() === address.toLowerCase()
      );
    })
    .map((request) => ({
      id: `request-${request.id}`,
      source: 'request' as const,
      status: request.status,
      title:
        request.status === 'paid'
          ? 'Payment request paid'
          : request.status === 'rejected'
          ? 'Payment request rejected'
          : 'Payment request created',
      actor: request.fromAddress,
      amount: Number(request.amount),
      memo: request.memo,
      hash: request.txHash,
      timestamp: request.createdAt,
    }));

  const contractEvents = events.map((event) => ({
    ...event,
    source: 'contract' as const,
  }));

  const feedItems = [...requestEvents, ...contractEvents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 50);

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-sm">Listening for payment activity...</p>
        <p className="text-xs">Payment requests and contract events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {feedItems.map((e) => {
        if (e.source === 'request') {
          const isIncoming = address ? e.actor.toLowerCase() !== address.toLowerCase() : false;
          const icon =
            e.status === 'paid' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
            e.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-400" /> :
            isIncoming ? <Inbox className="w-4 h-4 text-violet-500" /> :
            <Send className="w-4 h-4 text-blue-500" />;
          const bg =
            e.status === 'paid' ? 'bg-green-50' :
            e.status === 'rejected' ? 'bg-red-50' :
            isIncoming ? 'bg-violet-50' : 'bg-blue-50';
          const color =
            e.status === 'paid' ? 'text-green-700' :
            e.status === 'rejected' ? 'text-red-700' :
            isIncoming ? 'text-violet-700' : 'text-blue-700';

          return (
            <div key={e.id} className={`flex items-start gap-3 ${bg} rounded-xl p-3`}>
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${color}`}>{e.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {e.actor.slice(0, 8)}...{e.actor.slice(-4)}
                  {Number.isFinite(e.amount) ? ` · ${e.amount.toFixed(2)} XLM` : ''}
                  {e.memo ? ` · ${e.memo}` : ''}
                </p>
                {e.hash && <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">{e.hash}</p>}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(e.timestamp)}</span>
            </div>
          );
        }

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
