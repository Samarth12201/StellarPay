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

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      requests: [],
      fetchRequests: async (address: string) => {
        // In a purely local demo, we just rely on the persisted state.
        // We can filter the state here if needed, but for the demo we'll just keep all requests in the store.
      },
      addRequests: async (reqs) => {
        set((state) => ({ requests: [...reqs, ...state.requests] }));
      },
      updateStatus: async (id, status) => {
        set((state) => ({
          requests: state.requests.map((request) => (request.id === id ? { ...request, status } : request))
        }));
      },
      clear: () => set({ requests: [] }),
    }),
    { name: 'stellarpay-requests' }
  )
);
