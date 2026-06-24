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

// ─── Group Payment Types ──────────────────────────────────────

export interface GroupMember {
  id: string;            // nanoid(), internal key
  name: string;          // display name
  address: string;       // Stellar G... public key — REQUIRED, 56 chars
  avatarColor: string;   // hex color for avatar
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number;   // XLM
  paidBy: string;        // GroupMember.id of who paid upfront
  splitAmong: string[];  // array of GroupMember.id values
  date: Date;
  settled: boolean;
}

export interface Settlement {
  from: string;          // GroupMember.id of debtor (who pays)
  to: string;            // GroupMember.id of creditor (who receives)
  fromAddress: string;   // Stellar G... of debtor
  toAddress: string;     // Stellar G... of creditor
  fromName: string;
  toName: string;
  amount: number;        // XLM, rounded to 7 decimal places
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  expenses: Expense[];
  createdAt: Date;
}

// ─── Payment Request type (used for group settlements AND standalone requests)

export interface PaymentRequest {
  id: string;
  // Routing: these two fields determine whose inbox this appears in
  fromAddress: string;   // Stellar address of CREDITOR (who is owed money / created the request)
  toAddress: string;     // Stellar address of DEBTOR (who must pay — this is whose inbox it appears in)
  // Display
  fromName: string;      // display name of creditor
  amount: string;        // XLM string, e.g. "10.0000000"
  memo: string;
  // Group context (optional)
  groupId?: string;
  groupName?: string;
  // State
  status: 'pending' | 'paid' | 'rejected';
  txHash?: string;       // filled in after payment confirmed
  createdAt: Date;
}
