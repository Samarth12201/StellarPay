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

// ─── Member, Expense, Group ────────────────────────────────────

export interface GroupMember {
  id: string;           // nanoid() — internal primary key
  name: string;
  address: string;      // Stellar G... public key — REQUIRED, 56 chars, starts with G
  avatarColor: string;  // hex color
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number;  // XLM
  paidBy: string;       // GroupMember.id of who paid upfront
  splitAmong: string[]; // array of GroupMember.id — NOT addresses
  date: Date;
  settled: boolean;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  expenses: Expense[];
  createdAt: Date;
}

// ─── Settlement (calculated, never stored) ─────────────────────

export interface Settlement {
  from: string;         // GroupMember.id of debtor (owes money)
  to: string;           // GroupMember.id of creditor (is owed money)
  fromAddress: string;  // Stellar G... of debtor
  toAddress: string;    // Stellar G... of creditor
  fromName: string;
  toName: string;
  amount: number;       // XLM, 7 decimal precision
}

// ─── Payment Request ───────────────────────────────────────────

export interface PaymentRequest {
  id: string;
  // Routing — determines whose inbox this appears in:
  fromAddress: string;  // Stellar address of CREDITOR (who created the request / is owed money)
  toAddress: string;    // Stellar address of DEBTOR (must pay — this wallet's inbox)
  fromName: string;
  amount: string;       // XLM string "10.0000000"
  memo: string;
  groupId?: string;
  groupName?: string;
  status: 'pending' | 'paid' | 'rejected';
  txHash?: string;
  createdAt: Date;
}

