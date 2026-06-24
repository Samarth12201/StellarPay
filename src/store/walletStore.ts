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


