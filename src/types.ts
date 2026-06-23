export interface WalletState {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  network: 'TESTNET' | 'MAINNET';
}

export interface TransactionResult {
  hash: string;
  to: string;
  amount: string;
  memo?: string;
  status: 'success' | 'error' | 'pending';
  timestamp: Date;
}

export interface Participant {
  id: string;
  address: string;
  amount?: number;
}

export interface PaymentRequest {
  id: string;
  from: string;
  toAddress: string;
  amount: string;
  memo?: string;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: string;
}
