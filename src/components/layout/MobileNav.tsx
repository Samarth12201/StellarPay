import { Send, Calculator, QrCode, Inbox, Users, Gift } from 'lucide-react';
import { useRequestStore, useWalletStore } from '../../store';
import type { PaymentRequest } from '../../types';

const NAV_ITEMS = [
  { id: 'send',     label: 'Send',     icon: Send },
  { id: 'groups',   label: 'Split',    icon: Users },
  { id: 'pools',    label: 'Pools',    icon: Gift },
  { id: 'requests', label: 'Requests', icon: Inbox },
];

export function MobileNav({ active, setActive }: { active: string; setActive: (id: any) => void }) {
  const { address } = useWalletStore();
  const getPendingCount = useRequestStore((s) => s.getPendingCount);
  const pending = address ? getPendingCount(address) : 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-50 safe-area-inset-bottom">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium relative transition-colors ${
              isActive ? 'text-violet-600' : 'text-gray-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
            {label === 'Requests' && pending > 0 && (
              <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {pending}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
