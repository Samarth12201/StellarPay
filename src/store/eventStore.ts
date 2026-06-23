import { create } from 'zustand';

export interface ContractEvent {
  id: string;
  type: 'created' | 'paid' | 'rejected';
  requestId: number;
  actor: string;
  amount?: number;
  ledger: number;
  timestamp: Date;
}

interface EventStore {
  events: ContractEvent[];
  lastLedger: number;
  addEvents: (events: ContractEvent[]) => void;
  setLastLedger: (ledger: number) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  lastLedger: 0,
  addEvents: (newEvents) =>
    set((s) => ({ events: [...newEvents, ...s.events].slice(0, 50) })),
  setLastLedger: (lastLedger) => set({ lastLedger }),
}));
