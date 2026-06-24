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

export interface GroupMember {
  id: string;
  name: string;
  address: string;       // REQUIRED — Stellar G... public key
  avatarColor: string;
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number;   // in XLM
  paidBy: string;        // member.id of who paid
  splitAmong: string[];  // array of member.id values
  date: Date;
  txHash?: string;
}

export interface Settlement {
  from: string;          // member.id of who pays
  to: string;            // member.id of who receives
  fromAddress: string;   // Stellar G... of payer
  toAddress: string;     // Stellar G... of receiver
  fromName: string;
  toName: string;
  amount: number;        // XLM
  paid?: boolean;
  txHash?: string;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  expenses: Expense[];
  createdAt: Date;
}

export interface PaymentRequest {
  id: string;
  groupId?: string;
  groupName?: string;
  fromMemberId: string;
  fromName: string;
  fromAddress: string;     // who created the request (receiver)
  toAddress: string;       // who must pay (connected wallet)
  amount: string;
  memo: string;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: Date;
  txHash?: string;
}
