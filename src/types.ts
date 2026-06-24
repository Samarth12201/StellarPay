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

export interface Group {
  id: string;
  name: string;
  contractId?: string;      // on-chain group ID
  members: GroupMember[];
  expenses: Expense[];
  createdAt: Date;
}

export interface GroupMember {
  name: string;
  address: string;
  avatarColor: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;           // in XLM
  paidBy: string;           // member address
  splitAmong: string[];     // member addresses
  date: Date;
  txHash?: string;          // if settled on-chain
}

export interface Settlement {
  from: string;             // address of payer
  to: string;               // address of receiver
  amount: number;
  fromName: string;
  toName: string;
}

export interface DebtMatrix {
  [debtor: string]: {
    [creditor: string]: number;
  };
}
