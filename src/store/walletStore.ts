import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaymentRequest, WalletState } from '../types';

interface WalletStore extends WalletState {
  walletType: string | null;
  setWalletType: (type: string) => void;
  setAddress: (address: string) => void;
  setBalance: (balance: string) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      address: null,
      balance: null,
      isConnected: false,
      walletType: null,
      network: 'TESTNET',
      setWalletType: (walletType) => set({ walletType }),
      setAddress: (address) => set({ address }),
      setBalance: (balance) => set({ balance }),
      setConnected: (isConnected) => set({ isConnected }),
      reset: () => set({ address: null, balance: null, isConnected: false, walletType: null }),
    }),
    { name: 'stellarpay-wallet' },
  ),
);

interface RequestStore {
  requests: PaymentRequest[];
  fetchRequests: (address: string) => Promise<void>;
  addRequests: (requests: PaymentRequest[]) => Promise<void>;
  updateStatus: (id: string, status: PaymentRequest['status']) => Promise<void>;
  clear: () => void;
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  requests: [],
  fetchRequests: async (address: string) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/requests/${address}`);
      const data = await res.json();
      set({ requests: data });
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  },
  addRequests: async (reqs) => {
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqs)
      });
      set((state) => ({ requests: [...reqs, ...state.requests] }));
    } catch (err) {
      console.error('Failed to add requests', err);
    }
  },
  updateStatus: async (id, status) => {
    try {
      await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      set((state) => ({
        requests: state.requests.map((request) => (request.id === id ? { ...request, status } : request))
      }));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  },
  clear: () => set({ requests: [] }),
}));
