import { create } from 'zustand';

export type TxStatus = 'pending' | 'signing' | 'confirming' | 'success' | 'failed';

export interface TxRecord {
  id: string;
  status: TxStatus;
  description: string;
  hash?: string;
  timestamp: Date;
}

interface TxStore {
  transactions: TxRecord[];
  setTx: (tx: Omit<TxRecord, 'timestamp'>) => void;
  updateTxStatus: (id: string, status: TxStatus, hash?: string) => void;
  clearCompleted: () => void;
}

export const useTxStore = create<TxStore>((set) => ({
  transactions: [],
  setTx: (tx) =>
    set((s) => ({
      transactions: [{ ...tx, timestamp: new Date() }, ...s.transactions],
    })),
  updateTxStatus: (id, status, hash) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, status, hash: hash ?? t.hash } : t
      ),
    })),
  clearCompleted: () =>
    set((s) => ({
      transactions: s.transactions.filter(
        (t) => t.status === 'pending' || t.status === 'signing' || t.status === 'confirming'
      ),
    })),
}));
